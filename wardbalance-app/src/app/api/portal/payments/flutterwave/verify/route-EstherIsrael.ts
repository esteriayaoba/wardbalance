import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { logError, logWarn } from "@/lib/logger";
import { recordPayment } from "@/modules/payments/recorder.service";
import { enqueueNotification } from "@/lib/notifications";

const VerifyPaymentSchema = z.object({
  txRef: z.string().min(1, "Transaction reference is required"),
  transactionId: z.string().optional(),
  status: z.string().optional(),
  amount: z.coerce.number().optional(),
  invoiceId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "Parent") {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const parentId = session.userId;
    const schoolId = session.schoolId;

    const body = await request.json();
    const parsed = VerifyPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid parameters", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { txRef, transactionId, status, amount, invoiceId } = parsed.data;

    const existingPayment = await prisma.payment.findFirst({
      where: { schoolId, OR: [{ reference: txRef }, ...(transactionId ? [{ reference: transactionId }] : [])] },
    });

    if (existingPayment) {
      return NextResponse.json({
        data: { success: true, status: "confirmed", paymentId: existingPayment.id, message: "Payment already verified." },
      });
    }

    const flwSecretKey = process.env.FLW_SECRET_KEY;
    const isMock = !flwSecretKey || flwSecretKey === "mock";

    if (isMock) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Mock payment disabled in production.", code: "FORBIDDEN" }, { status: 403 });
      }
      if (status !== "completed" || !invoiceId || !amount) {
        return NextResponse.json({ error: "Transaction verification failed", code: "PAYMENT_FAILED" }, { status: 422 });
      }

      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, schoolId, student: { parents: { some: { parentId } } } },
        include: { student: { select: { id: true } } },
      });

      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found or unauthorized.", code: "NOT_FOUND" }, { status: 404 });
      }

      const result = await recordPayment({
        schoolId,
        invoiceId,
        studentId: invoice.studentId,
        parentId,
        amount: new Prisma.Decimal(amount),
        method: "card",
        reference: txRef,
        recordedById: null,
        actorId: parentId,
        actorName: session.fullName,
        action: "payment.recorded",
        receiptPrefix: "RCT-FLW",
      });

      await enqueueNotification({
        schoolId, parentId, channel: "email",
        recipient: session.email || parentId,
        subject: "Payment Received — WardBalance",
        content: `Your payment of ₦${Number(amount).toLocaleString()} has been received. Receipt: ${result.receipt.receiptNumber}`,
        reference: `payment-${result.payment.id}`,
      });

      return NextResponse.json({
        data: { success: true, status: "confirmed", paymentId: result.payment.id, receiptNumber: result.receipt.receiptNumber, message: "Payment processed." },
      });
    }

    if (!transactionId) {
      await prisma.auditLog.create({
        data: { schoolId, actorId: parentId, actorName: session.fullName, action: "payment.verify_failed", entityType: "Payment", entityId: txRef, newValue: { reason: "missing_transaction_id", txRef } },
      });
      return NextResponse.json({ error: "Missing Flutterwave transaction ID" }, { status: 400 });
    }

    await prisma.auditLog.create({
      data: { schoolId, actorId: parentId, actorName: session.fullName, action: "payment.verify_attempt", entityType: "Payment", entityId: transactionId, newValue: { txRef, transactionId } },
    });

    const flwResponse = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      headers: { Authorization: `Bearer ${flwSecretKey}` },
    });
    const flwBody = await flwResponse.json();

    if (!flwResponse.ok || flwBody.data?.status !== "successful") {
      await prisma.auditLog.create({
        data: { schoolId, actorId: parentId, actorName: session.fullName, action: "payment.verify_failed", entityType: "Payment", entityId: transactionId, newValue: { reason: "api_verification_failed", txRef, transactionId, flwMessage: flwBody.message } },
      });
      return NextResponse.json({ error: "Verification failed", code: "PAYMENT_FAILED" }, { status: 400 });
    }

    const verifiedData = flwBody.data;

    if (verifiedData.currency !== "NGN") {
      await prisma.auditLog.create({
        data: { schoolId, actorId: parentId, actorName: session.fullName, action: "payment.currency_mismatch", entityType: "Payment", entityId: transactionId, newValue: { reason: "currency_mismatch", expected: "NGN", actual: verifiedData.currency, txRef, transactionId } },
      });
      return NextResponse.json({ error: "Only NGN transactions allowed.", code: "PAYMENT_FAILED" }, { status: 400 });
    }

    if (verifiedData.status !== "successful") {
      await prisma.auditLog.create({
        data: { schoolId, actorId: parentId, actorName: session.fullName, action: "payment.verify_failed", entityType: "Payment", entityId: transactionId, newValue: { reason: "transaction_not_successful", actualStatus: verifiedData.status, txRef, transactionId } },
      });
      return NextResponse.json({ error: "Payment was not successful.", code: "PAYMENT_FAILED" }, { status: 400 });
    }

    const invoiceIdMeta = verifiedData.meta?.invoiceId;
    if (!invoiceIdMeta) {
      await prisma.auditLog.create({
        data: { schoolId, actorId: parentId, actorName: session.fullName, action: "payment.verify_failed", entityType: "Payment", entityId: transactionId, newValue: { reason: "missing_invoice_id_metadata", txRef, transactionId } },
      });
      return NextResponse.json({ error: "Missing invoice ID in metadata.", code: "PAYMENT_FAILED" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceIdMeta, schoolId, student: { parents: { some: { parentId } } } },
      include: { student: { select: { id: true } } },
    });

    if (!invoice) {
      await prisma.auditLog.create({
        data: { schoolId, actorId: parentId, actorName: session.fullName, action: "payment.parent_authorization_failed", entityType: "Payment", entityId: transactionId, newValue: { reason: "invoice_not_found_or_unauthorized", invoiceId: invoiceIdMeta, txRef, transactionId } },
      });
      return NextResponse.json({ error: "Invoice not found.", code: "NOT_FOUND" }, { status: 404 });
    }

    const result = await recordPayment({
      schoolId,
      invoiceId: invoiceIdMeta,
      studentId: invoice.studentId,
      parentId,
      amount: new Prisma.Decimal(verifiedData.amount),
      method: "card",
      reference: txRef,
      recordedById: null,
      actorId: parentId,
      actorName: session.fullName,
      action: "payment.verify_success",
      receiptPrefix: "RCT-FLW",
    });

    await enqueueNotification({
      schoolId, parentId, channel: "email",
      recipient: session.email || parentId,
      subject: "Payment Confirmed — WardBalance",
      content: `Your payment of ₦${Number(verifiedData.amount).toLocaleString()} has been confirmed. Receipt: ${result.receipt.receiptNumber}`,
      reference: `payment-${result.payment.id}`,
    });

    return NextResponse.json({
      data: { success: true, status: "confirmed", paymentId: result.payment.id, receiptNumber: result.receipt.receiptNumber },
    });
  } catch (err) {
    logError("flutterwave-verify", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment verification failed", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
