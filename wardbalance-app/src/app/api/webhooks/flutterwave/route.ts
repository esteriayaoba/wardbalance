import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook signature
    const signature = request.headers.get("verif-hash");
    const secretHash = process.env.FLW_WEBHOOK_SECRET;

    // Enforce webhook secret check in production
    const isProd = process.env.NODE_ENV === "production";
    if (isProd && (!secretHash || signature !== secretHash)) {
      console.warn("[FLW Webhook] Rejected: Invalid or missing webhook signature.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Allow mock/bypassed signature in development if not configured
    if (!isProd && secretHash && signature !== secretHash) {
      console.warn("[FLW Webhook] Dev warning: signature mismatch, but proceeding since in development.");
    }

    const payload = await request.json();

    // 2. Only process completed successful charge events
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

    // Log the initial webhook attempt
    if (tempSchoolId) {
      await prisma.auditLog.create({
        data: {
          schoolId: tempSchoolId,
          actorId: tempParentId || "webhook-system",
          actorName: "Flutterwave Webhook System",
          action: "payment.webhook_attempt",
          entityType: "Payment",
          entityId: transactionId,
          newValue: { txRef, transactionId, invoiceId: tempInvoiceId },
        },
      });
    }

    // 3. Idempotency Check — verify transaction reference has not been processed already
    const existingPayment = await prisma.payment.findFirst({
      where: {
        OR: [
          { reference: txRef },
          { reference: transactionId },
        ],
      },
    });

    if (existingPayment) {
      console.log(`[FLW Webhook] Transaction ${txRef} / ${transactionId} already processed.`);
      if (tempSchoolId) {
        await prisma.auditLog.create({
          data: {
            schoolId: tempSchoolId,
            actorId: tempParentId || "webhook-system",
            actorName: "Flutterwave Webhook System",
            action: "payment.duplicate_ignored",
            entityType: "Payment",
            entityId: transactionId,
            newValue: { txRef, transactionId, paymentId: existingPayment.id },
          },
        });
      }
      return NextResponse.json({ received: true, duplicated: true });
    }

    // 4. Server-to-server verification with Flutterwave API to prevent payload spoofing
    const flwSecretKey = process.env.FLW_SECRET_KEY;
    if (!flwSecretKey && isProd) {
      console.error("[FLW Webhook] FLW_SECRET_KEY is missing in production.");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    let verifiedData = flwData;

    // If API secret key is configured, perform standard transaction verify check
    if (flwSecretKey && flwSecretKey !== "mock") {
      const flwVerifyRes = await fetch(
        `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
        {
          headers: { Authorization: `Bearer ${flwSecretKey}` },
        }
      );
      const flwVerifyBody = await flwVerifyRes.json();

      if (!flwVerifyRes.ok || flwVerifyBody.data.status !== "successful") {
        console.error(`[FLW Webhook] Flutterwave verification API failed for txn: ${transactionId}`);
        if (tempSchoolId) {
          await prisma.auditLog.create({
            data: {
              schoolId: tempSchoolId,
              actorId: tempParentId || "webhook-system",
              actorName: "Flutterwave Webhook System",
              action: "payment.webhook_attempt_failed",
              entityType: "Payment",
              entityId: transactionId,
              newValue: {
                reason: "flutterwave_api_verification_failed",
                txRef,
                transactionId,
                flwMessage: flwVerifyBody.message,
              },
            },
          });
        }
        return NextResponse.json({ error: "Flutterwave verification failed" }, { status: 400 });
      }
      verifiedData = flwVerifyBody.data;
    }

    // Check currency is NGN
    if (verifiedData.currency !== "NGN") {
      console.warn(`[FLW Webhook] Currency mismatch: ${verifiedData.currency}`);
      if (tempSchoolId) {
        await prisma.auditLog.create({
          data: {
            schoolId: tempSchoolId,
            actorId: tempParentId || "webhook-system",
            actorName: "Flutterwave Webhook System",
            action: "payment.currency_mismatch",
            entityType: "Payment",
            entityId: transactionId,
            newValue: {
              reason: "currency_mismatch",
              expected: "NGN",
              actual: verifiedData.currency,
              txRef,
              transactionId,
            },
          },
        });
      }
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    const verifiedAmount = new Prisma.Decimal(verifiedData.amount);
    const invoiceId = verifiedData.meta?.invoiceId || flwData.meta?.invoiceId;
    const schoolId = verifiedData.meta?.schoolId || flwData.meta?.schoolId;
    const parentId = verifiedData.meta?.parentId || flwData.meta?.parentId;

    if (!invoiceId || !schoolId) {
      console.error("[FLW Webhook] Missing invoiceId or schoolId in metadata.", verifiedData.meta);
      return NextResponse.json({ error: "Missing metadata fields" }, { status: 400 });
    }

    // Fetch and verify associated invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId },
      include: { term: true },
    });

    if (!invoice) {
      console.error(`[FLW Webhook] Invoice ${invoiceId} not found under school ${schoolId}.`);
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorId: parentId || "webhook-system",
          actorName: "Flutterwave Webhook System",
          action: "payment.parent_authorization_failed",
          entityType: "Payment",
          entityId: transactionId,
          newValue: {
            reason: "invoice_not_found",
            invoiceId,
            txRef,
            transactionId,
          },
        },
      });
      return NextResponse.json({ error: "Associated invoice not found" }, { status: 404 });
    }

    if (invoice.term.status === "locked") {
      console.warn(`[FLW Webhook] Rejected: Invoice ${invoiceId} term is locked.`);
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorId: parentId || "webhook-system",
          actorName: "Flutterwave Webhook System",
          action: "payment.verify_failed",
          entityType: "Payment",
          entityId: transactionId,
          newValue: {
            reason: "term_locked",
            invoiceId,
            txRef,
            transactionId,
          },
        },
      });
      return NextResponse.json({ error: "Term is locked" }, { status: 422 });
    }

    if (verifiedAmount.greaterThan(invoice.balanceDue)) {
      console.warn(`[FLW Webhook] Payment amount ₦${verifiedAmount} exceeds invoice balance due ₦${invoice.balanceDue}.`);
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorId: parentId || "webhook-system",
          actorName: "Flutterwave Webhook System",
          action: "payment.amount_mismatch",
          entityType: "Payment",
          entityId: transactionId,
          newValue: {
            reason: "amount_exceeds_balance_due",
            invoiceId,
            balanceDue: invoice.balanceDue.toNumber(),
            verifiedAmount: verifiedAmount.toNumber(),
            txRef,
            transactionId,
          },
        },
      });
      return NextResponse.json({ error: "Amount exceeds balance due" }, { status: 400 });
    }

    // 5. Execute payment recording and balance updates in transaction
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          schoolId,
          invoiceId,
          studentId: invoice.studentId,
          parentId: parentId || null,
          amount: verifiedAmount,
          method: "bank_transfer",
          status: "recorded",
          reference: txRef,
          recordedById: (await tx.user.findFirst({ where: { schoolId } }))?.id ?? "webhook-actor-id",
        },
      });

      const newAmountPaid = invoice.amountPaid.plus(verifiedAmount);
      const newBalanceDue = invoice.finalAmount.minus(newAmountPaid);
      let newStatus = invoice.status;

      if (newBalanceDue.lte(0)) {
        newStatus = "paid";
      } else if (newAmountPaid.gt(0)) {
        newStatus = "partial";
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
      });

      await tx.receipt.create({
        data: {
          schoolId,
          paymentId: payment.id,
          receiptNumber: `RCT-FLW-WH-${Date.now().toString().slice(-6)}`,
        },
      });

      // Write Audit Log
      await tx.auditLog.create({
        data: {
          schoolId,
          actorId: parentId || "webhook-system",
          actorName: "Flutterwave Webhook System",
          action: "payment.webhook_verified",
          entityType: "Payment",
          entityId: payment.id,
          newValue: {
            amount: verifiedAmount.toNumber(),
            method: "flutterwave_webhook",
            reference: txRef,
            invoiceStatus: newStatus,
          },
        },
      });
    });

    console.log(`[FLW Webhook] Payment recorded successfully for invoice ${invoiceId}. Ref: ${transactionId}`);
    return NextResponse.json({ received: true, success: true });
  } catch (err: any) {
    console.error("[FLW Webhook] Error processing payment:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Webhook Error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
