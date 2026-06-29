import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { recordPayment } from "@/services/payment-recorder.service";
import { enqueueNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("verif-hash");
    const secretHash = process.env.FLW_WEBHOOK_SECRET;
    const isProd = process.env.NODE_ENV === "production";

    if (isProd && (!secretHash || signature !== secretHash)) {
      logWarn("flutterwave-webhook", "Rejected: invalid or missing webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (!isProd && secretHash && signature !== secretHash) {
      logWarn("flutterwave-webhook", "Dev signature mismatch, proceeding");
    }

    const payload = await request.json();

    if (payload.event !== "charge.completed" || payload.data?.status !== "successful") {
      return NextResponse.json({ received: true, ignored: true });
    }

    const flwData = payload.data;
    const txRef = flwData.tx_ref;
    const transactionId = String(flwData.id);
    const amount = Number(flwData.amount);
    const tempInvoiceId = flwData.meta?.invoiceId;
    const tempSchoolId = flwData.meta?.schoolId;
    const tempParentId = flwData.meta?.parentId;

    if (tempSchoolId) {
      await prisma.auditLog.create({
        data: {
          schoolId: tempSchoolId, actorId: tempParentId || "webhook-system",
          actorName: "Flutterwave Webhook", action: "payment.webhook_attempt",
          entityType: "Payment", entityId: transactionId,
          newValue: { txRef, transactionId, invoiceId: tempInvoiceId },
        },
      });
    }

    const existingPayment = await prisma.payment.findFirst({
      where: { OR: [{ reference: txRef }, { reference: transactionId }] },
    });

    if (existingPayment) {
      logInfo("flutterwave-webhook", `Transaction ${txRef} already processed`);
      if (tempSchoolId) {
        await prisma.auditLog.create({
          data: {
            schoolId: tempSchoolId, actorId: tempParentId || "webhook-system",
            actorName: "Flutterwave Webhook", action: "payment.duplicate_ignored",
            entityType: "Payment", entityId: transactionId,
            newValue: { txRef, transactionId, paymentId: existingPayment.id },
          },
        });
      }
      return NextResponse.json({ received: true, duplicated: true });
    }

    const flwSecretKey = process.env.FLW_SECRET_KEY;
    if (!flwSecretKey && isProd) {
      logError("flutterwave-webhook", "FLW_SECRET_KEY missing in production");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    let verifiedData = flwData;

    if (flwSecretKey && flwSecretKey !== "mock") {
      const flwVerifyRes = await fetch(
        `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
        { headers: { Authorization: `Bearer ${flwSecretKey}` } }
      );
      const flwVerifyBody = await flwVerifyRes.json();

      if (!flwVerifyRes.ok || flwVerifyBody.data.status !== "successful") {
        logWarn("flutterwave-webhook", `Verification API failed for ${transactionId}`);
        if (tempSchoolId) {
          await prisma.auditLog.create({
            data: {
              schoolId: tempSchoolId, actorId: tempParentId || "webhook-system",
              actorName: "Flutterwave Webhook", action: "payment.webhook_attempt_failed",
              entityType: "Payment", entityId: transactionId,
              newValue: { reason: "api_verification_failed", txRef, transactionId, flwMessage: flwVerifyBody.message },
            },
          });
        }
        return NextResponse.json({ error: "Flutterwave verification failed" }, { status: 400 });
      }
      verifiedData = flwVerifyBody.data;
    }

    if (verifiedData.currency !== "NGN") {
      logWarn("flutterwave-webhook", `Currency mismatch: ${verifiedData.currency}`);
      if (tempSchoolId) {
        await prisma.auditLog.create({
          data: {
            schoolId: tempSchoolId, actorId: tempParentId || "webhook-system",
            actorName: "Flutterwave Webhook", action: "payment.currency_mismatch",
            entityType: "Payment", entityId: transactionId,
            newValue: { reason: "currency_mismatch", expected: "NGN", actual: verifiedData.currency, txRef, transactionId },
          },
        });
      }
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    const invoiceId = verifiedData.meta?.invoiceId || flwData.meta?.invoiceId;
    const schoolId = verifiedData.meta?.schoolId || flwData.meta?.schoolId;
    const parentId = verifiedData.meta?.parentId || flwData.meta?.parentId;

    if (!invoiceId || !schoolId) {
      logError("flutterwave-webhook", "Missing invoiceId or schoolId in metadata");
      return NextResponse.json({ error: "Missing metadata fields" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId },
      include: { student: { select: { id: true } } },
    });

    if (!invoice) {
      logWarn("flutterwave-webhook", `Invoice ${invoiceId} not found`);
      await prisma.auditLog.create({
        data: {
          schoolId, actorId: parentId || "webhook-system",
          actorName: "Flutterwave Webhook", action: "payment.parent_authorization_failed",
          entityType: "Payment", entityId: transactionId,
          newValue: { reason: "invoice_not_found", invoiceId, txRef, transactionId },
        },
      });
      return NextResponse.json({ error: "Associated invoice not found" }, { status: 404 });
    }

    const result = await recordPayment({
      schoolId,
      invoiceId,
      studentId: invoice.studentId,
      parentId: parentId || null,
      amount: new Prisma.Decimal(verifiedData.amount),
      method: "card",
      reference: txRef,
      recordedById: null,
      actorId: parentId || "webhook-system",
      actorName: "Flutterwave Webhook",
      action: "payment.webhook_verified",
      receiptPrefix: "RCT-FLW",
    });

    if (parentId) {
      await enqueueNotification({
        schoolId,
        parentId,
        channel: "email",
        recipient: parentId,
        subject: "Payment Received — WardBalance",
        content: `Your payment of ₦${Number(verifiedData.amount).toLocaleString()} has been received and credited to invoice ${invoiceId}. Receipt: ${result.receipt.receiptNumber}`,
        reference: `payment-${result.payment.id}`,
      });
    }

    logInfo("flutterwave-webhook", `Payment recorded for invoice ${invoiceId}, ref: ${txRef}`);
    return NextResponse.json({ received: true, success: true });
  } catch (err) {
    logError("flutterwave-webhook", err);
    return NextResponse.json(
      { error: "Internal Webhook Error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
