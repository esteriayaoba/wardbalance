import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { processSubscriptionPayment } from "@/services/subscription-payment.service";
import { processFlutterwavePayment } from "@/services/flutterwave-webhook.service";
import { enqueueNotification } from "@/lib/notifications";
import { z } from "zod";

const FlutterwaveWebhookSchema = z.object({
  event: z.literal("charge.completed"),
  data: z.object({
    id: z.number(),
    status: z.literal("successful"),
    tx_ref: z.string(),
    amount: z.number().positive(),
    currency: z.string().default("NGN"),
    meta: z.object({
      invoiceId: z.string(),
      schoolId: z.string(),
      parentId: z.string(),
    }),
  }),
});

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

    const parsed = FlutterwaveWebhookSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const flwData = parsed.data.data;
    const txRef = flwData.tx_ref;
    const transactionId = String(flwData.id);
    const tempInvoiceId = flwData.meta.invoiceId;
    const tempSchoolId = flwData.meta.schoolId;
    const tempParentId = flwData.meta.parentId;

    if (tempSchoolId) {
      await prisma.$transaction(async (tx) => {
        await tx.auditLog.create({
          data: {
            schoolId: tempSchoolId, actorId: tempParentId || "webhook-system",
            actorName: "Flutterwave Webhook", action: "payment.webhook_attempt",
            entityType: "Payment", entityId: transactionId,
            newValue: { txRef, transactionId, invoiceId: tempInvoiceId },
          },
        });
      });
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
          await prisma.$transaction(async (tx) => {
            await tx.auditLog.create({
              data: {
                schoolId: tempSchoolId, actorId: tempParentId || "webhook-system",
                actorName: "Flutterwave Webhook", action: "payment.webhook_attempt_failed",
                entityType: "Payment", entityId: transactionId,
                newValue: { reason: "api_verification_failed", txRef, transactionId, flwMessage: flwVerifyBody.message },
              },
            });
          });
        }
        return NextResponse.json({ error: "Flutterwave verification failed" }, { status: 400 });
      }
      verifiedData = flwVerifyBody.data;
    }

    if (verifiedData.currency !== "NGN") {
      logWarn("flutterwave-webhook", `Currency mismatch: ${verifiedData.currency}`);
      if (tempSchoolId) {
        await prisma.$transaction(async (tx) => {
          await tx.auditLog.create({
            data: {
              schoolId: tempSchoolId, actorId: tempParentId || "webhook-system",
              actorName: "Flutterwave Webhook", action: "payment.currency_mismatch",
              entityType: "Payment", entityId: transactionId,
              newValue: { reason: "currency_mismatch", expected: "NGN", actual: verifiedData.currency, txRef, transactionId },
            },
          });
        });
      }
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    const schoolId = verifiedData.meta?.schoolId || flwData.meta?.schoolId;

    if (!schoolId) {
      logError("flutterwave-webhook", "Missing schoolId in metadata");
      return NextResponse.json({ error: "Missing metadata fields" }, { status: 400 });
    }

    // ── Subscription payment branch (tx_ref starts with "SUB-") ──────────────
    if (txRef.startsWith("SUB-")) {
      const metaSubscriptionId = verifiedData.meta?.subscriptionId || flwData.meta?.subscriptionId;
      const metaPlanId = verifiedData.meta?.planId || flwData.meta?.planId;

      if (!metaSubscriptionId || !metaPlanId) {
        logWarn("flutterwave-webhook", `Missing subscription metadata for SUB- tx: ${txRef}`);
        return NextResponse.json({ error: "Missing subscription metadata" }, { status: 400 });
      }

      // Check idempotency — has this transaction been processed?
      const existingTx = await prisma.billingTransaction.findUnique({
        where: { flwTransactionId: transactionId },
      });
      if (existingTx) {
        logInfo("flutterwave-webhook", `Subscription tx ${txRef} already processed`);
        return NextResponse.json({ received: true, duplicated: true });
      }

      // Extract card token from Flutterwave response
      const card = verifiedData.card as {
        token?: string;
        last_4digits?: string;
        brand?: string;
        expirymonth?: string;
        expiryyear?: string;
      } | undefined;

      const cardToken = card?.token
        ? {
            token: card.token,
            last4: card.last_4digits ?? "",
            brand: card.brand ?? "",
            expiry: `${card.expirymonth ?? "??"}/${card.expiryyear ?? "??"}`,
          }
        : null;

      const result = await processSubscriptionPayment({
        schoolId,
        subscriptionId: metaSubscriptionId,
        planId: metaPlanId,
        amount: Number(verifiedData.amount),
        flwTransactionId: transactionId,
        flwCustomerId: String(verifiedData.customer?.id ?? ""),
        cardToken,
        billingPeriod: "term",
      });

      logInfo("flutterwave-webhook", `Subscription payment processed: invoice ${result.invoice.invoiceNumber}, ref: ${txRef}`);
      return NextResponse.json({ received: true, success: true, type: "subscription" });
    }

    // ── School invoice payment branch (existing logic) ──────────────────────
    const invoiceId = verifiedData.meta?.invoiceId || flwData.meta?.invoiceId;
    const parentId = verifiedData.meta?.parentId || flwData.meta?.parentId;

    if (!invoiceId) {
      logError("flutterwave-webhook", "Missing invoiceId in metadata for school payment");
      return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
    }

    const result = await processFlutterwavePayment({
      tx_ref: txRef,
      id: flwData.id,
      amount: verifiedData.amount,
      currency: verifiedData.currency,
      meta: { invoiceId, schoolId, parentId: parentId || "" },
    });

    if ("duplicate" in result && result.duplicate) {
      logInfo("flutterwave-webhook", `Transaction ${txRef} already processed`);
      return NextResponse.json({ received: true, duplicated: true });
    }

    if (parentId) {
      const successResult = result as { receipt: { receiptNumber: string }; payment: { id: string } };
      await enqueueNotification({
        schoolId,
        parentId,
        channel: "email",
        recipient: parentId,
        subject: "Payment Received — WardBalance",
        content: `Your payment of ₦${Number(verifiedData.amount).toLocaleString()} has been received and credited to invoice ${invoiceId}. Receipt: ${successResult.receipt.receiptNumber}`,
        reference: `payment-${successResult.payment.id}`,
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
