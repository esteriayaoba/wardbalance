import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

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
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const parentId = session.userId;
    const schoolId = session.schoolId;

    const body = await request.json();
    const parsed = VerifyPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid verification parameters", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { txRef, transactionId, status, amount, invoiceId } = parsed.data;

    // Check if payment was already recorded (Idempotency)
    const existingPayment = await prisma.payment.findFirst({
      where: {
        schoolId,
        OR: [
          { reference: txRef },
          ...(transactionId ? [{ reference: transactionId }] : []),
        ],
      },
    });

    if (existingPayment) {
      return NextResponse.json({
        data: {
          success: true,
          status: "confirmed",
          paymentId: existingPayment.id,
          message: "Payment verified successfully.",
        },
      });
    }

    // MOCK MODE VERIFICATION & RECORDING
    const flwSecretKey = process.env.FLW_SECRET_KEY;
    const isMock = !flwSecretKey || flwSecretKey === "mock";

    if (isMock) {
      const isProd = process.env.NODE_ENV === "production";
      if (isProd) {
        return NextResponse.json(
          { error: "Mock payment verification is disabled in production.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }

      if (status !== "completed" || !invoiceId || !amount) {
        return NextResponse.json(
          { error: "Transaction verification failed", code: "PAYMENT_FAILED" },
          { status: 422 }
        );
      }

      // Fetch invoice
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          schoolId,
          student: {
            parents: { some: { parentId } },
          },
        },
        include: { student: true },
      });

      if (!invoice) {
        return NextResponse.json(
          { error: "Invoice not found or unauthorized.", code: "NOT_FOUND" },
          { status: 404 }
        );
      }

      // Execute payment recording in transaction
      const paymentAmount = new Prisma.Decimal(amount);
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create payment
        const payment = await tx.payment.create({
          data: {
            schoolId,
            invoiceId,
            studentId: invoice.studentId,
            parentId,
            amount: paymentAmount,
            method: "bank_transfer", // Map card/USSd as bank transfer for schema compatibility
            status: "recorded",
            reference: txRef,
            recordedById: (await tx.user.findFirst({ where: { schoolId } }))?.id ?? "mock-actor-id",
          },
        });

        // 2. Recalculate invoice
        const newAmountPaid = invoice.amountPaid.plus(paymentAmount);
        const newBalanceDue = invoice.finalAmount.minus(newAmountPaid);
        let newStatus = invoice.status;

        if (newBalanceDue.lte(0)) {
          newStatus = "paid";
        } else if (newAmountPaid.gt(0)) {
          newStatus = "partial";
        }

        const updatedInvoice = await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            status: newStatus,
          },
        });

        // 3. Create Receipt
        const receipt = await tx.receipt.create({
          data: {
            schoolId,
            paymentId: payment.id,
            receiptNumber: `RCT-FLW-${Date.now().toString().slice(-6)}`,
          },
        });

        // 4. Create Audit Log
        await tx.auditLog.create({
          data: {
            schoolId,
            actorId: parentId,
            actorName: session.fullName,
            action: "payment.recorded",
            entityType: "Payment",
            entityId: payment.id,
            newValue: {
              amount: paymentAmount.toNumber(),
              method: "flutterwave",
              reference: txRef,
              invoiceStatus: newStatus,
            },
          },
        });

        return { payment, receipt, updatedInvoice };
      });

      return NextResponse.json({
        data: {
          success: true,
          status: "confirmed",
          paymentId: result.payment.id,
          receiptNumber: result.receipt.receiptNumber,
          message: "Payment successfully processed and verified.",
        },
      });
    }

    // REAL FLUTTERWAVE VERIFICATION (Phase 2B integration scaffold)
    if (!transactionId) {
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorId: parentId,
          actorName: session.fullName || "Parent User",
          action: "payment.verify_failed",
          entityType: "Payment",
          entityId: txRef,
          newValue: { reason: "missing_transaction_id", txRef },
        },
      });
      return NextResponse.json({ error: "Missing Flutterwave transaction ID" }, { status: 400 });
    }

    // Log the initial verification attempt
    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId: parentId,
        actorName: session.fullName || "Parent User",
        action: "payment.verify_attempt",
        entityType: "Payment",
        entityId: transactionId,
        newValue: { txRef, transactionId },
      },
    });

    const flwResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      {
        headers: { Authorization: `Bearer ${flwSecretKey}` },
      }
    );
    const flwBody = await flwResponse.json();

    if (!flwResponse.ok || flwBody.data.status !== "successful") {
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorId: parentId,
          actorName: session.fullName || "Parent User",
          action: "payment.verify_failed",
          entityType: "Payment",
          entityId: transactionId,
          newValue: {
            reason: "flutterwave_api_verification_failed",
            txRef,
            transactionId,
            flwMessage: flwBody.message,
          },
        },
      });
      return NextResponse.json(
        { error: "Verification via Flutterwave API failed", code: "PAYMENT_FAILED" },
        { status: 400 }
      );
    }

    const verifiedData = flwBody.data;

    // Safety checks: verify currency, status, amount, and invoiceId metadata
    if (verifiedData.currency !== "NGN") {
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorId: parentId,
          actorName: session.fullName || "Parent User",
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
      return NextResponse.json(
        { error: "Payment currency mismatch. Only NGN transactions are allowed.", code: "PAYMENT_FAILED" },
        { status: 400 }
      );
    }

    if (verifiedData.status !== "successful") {
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorId: parentId,
          actorName: session.fullName || "Parent User",
          action: "payment.verify_failed",
          entityType: "Payment",
          entityId: transactionId,
          newValue: {
            reason: "transaction_not_successful",
            actualStatus: verifiedData.status,
            txRef,
            transactionId,
          },
        },
      });
      return NextResponse.json(
        { error: "Payment transaction was not successful.", code: "PAYMENT_FAILED" },
        { status: 400 }
      );
    }

    const verifiedAmount = new Prisma.Decimal(verifiedData.amount);
    const invoiceIdMeta = verifiedData.meta?.invoiceId;

    if (!invoiceIdMeta) {
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorId: parentId,
          actorName: session.fullName || "Parent User",
          action: "payment.verify_failed",
          entityType: "Payment",
          entityId: transactionId,
          newValue: { reason: "missing_invoice_id_metadata", txRef, transactionId },
        },
      });
      return NextResponse.json(
        { error: "Missing invoice ID in payment metadata.", code: "PAYMENT_FAILED" },
        { status: 400 }
      );
    }

    // Fetch invoice and check parent-ward ownership
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceIdMeta,
        schoolId,
        student: {
          parents: { some: { parentId } },
        },
      },
      include: { term: true },
    });

    if (!invoice) {
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorId: parentId,
          actorName: session.fullName || "Parent User",
          action: "payment.parent_authorization_failed",
          entityType: "Payment",
          entityId: transactionId,
          newValue: {
            reason: "invoice_not_found_or_unauthorized",
            invoiceId: invoiceIdMeta,
            parentId,
            txRef,
            transactionId,
          },
        },
      });
      return NextResponse.json({ error: "Associated invoice not found or unauthorized.", code: "NOT_FOUND" }, { status: 404 });
    }

    if (invoice.term.status === "locked") {
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorId: parentId,
          actorName: session.fullName || "Parent User",
          action: "payment.verify_failed",
          entityType: "Payment",
          entityId: transactionId,
          newValue: {
            reason: "term_locked",
            invoiceId: invoiceIdMeta,
            txRef,
            transactionId,
          },
        },
      });
      return NextResponse.json({ error: "Write attempted on a locked term.", code: "TERM_LOCKED" }, { status: 422 });
    }

    if (verifiedAmount.greaterThan(invoice.balanceDue)) {
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorId: parentId,
          actorName: session.fullName || "Parent User",
          action: "payment.amount_mismatch",
          entityType: "Payment",
          entityId: transactionId,
          newValue: {
            reason: "amount_exceeds_balance_due",
            invoiceId: invoiceIdMeta,
            balanceDue: invoice.balanceDue.toNumber(),
            verifiedAmount: verifiedAmount.toNumber(),
            txRef,
            transactionId,
          },
        },
      });
      return NextResponse.json({ error: "Payment amount exceeds invoice balance due.", code: "BAD_REQUEST" }, { status: 400 });
    }

    // Execute payment in transaction
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          schoolId,
          invoiceId: invoiceIdMeta,
          studentId: invoice.studentId,
          parentId,
          amount: verifiedAmount,
          method: "bank_transfer",
          status: "recorded",
          reference: txRef,
          recordedById: (await tx.user.findFirst({ where: { schoolId } }))?.id ?? "bursar-actor-id",
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
        where: { id: invoiceIdMeta },
        data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, status: newStatus },
      });

      const receipt = await tx.receipt.create({
        data: {
          schoolId,
          paymentId: payment.id,
          receiptNumber: `RCT-FLW-${Date.now().toString().slice(-6)}`,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorId: parentId,
          actorName: session.fullName,
          action: "payment.verify_success",
          entityType: "Payment",
          entityId: payment.id,
          newValue: { amount: verifiedAmount.toNumber(), reference: txRef },
        },
      });

      return { payment, receipt };
    });

    return NextResponse.json({
      data: {
        success: true,
        status: "confirmed",
        paymentId: result.payment.id,
        receiptNumber: result.receipt.receiptNumber,
      },
    });
  } catch (err: any) {
    console.error("[payments/flutterwave/verify] Error:", err);
    return NextResponse.json(
      { error: err.message ?? "Payment verification failed", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
