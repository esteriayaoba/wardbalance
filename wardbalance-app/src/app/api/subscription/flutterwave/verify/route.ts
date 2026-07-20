import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { processSubscriptionPayment } from "@/services/subscription-payment.service";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner"]);
    if (!guard.authorized) return guard.response;

    const schoolId = guard.session.schoolId;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const transactionId = searchParams.get("transaction_id");
    const txRef = searchParams.get("tx_ref");

    if (status === "callback" || status === "completed" || status === "successful") {
      if (!transactionId && !txRef) {
        return NextResponse.redirect(
          new URL("/admin/settings/subscription?flutterwave_status=missing_ref", request.url),
        );
      }

      // Look up by transaction_id or tx_ref
      let lookupId = transactionId;
      if (!lookupId && txRef) {
        const existingTx = await prisma.billingTransaction.findFirst({
          where: { flwTransactionId: txRef },
          select: { flwTransactionId: true },
        });
        if (existingTx) {
          lookupId = existingTx.flwTransactionId;
        }
      }

      if (!lookupId) {
        return NextResponse.redirect(
          new URL("/admin/settings/subscription?flutterwave_status=pending", request.url),
        );
      }

      // Verify with Flutterwave API
      const flwSecretKey = process.env.FLW_SECRET_KEY;
      if (flwSecretKey && flwSecretKey !== "mock") {
        const flwRes = await fetch(
          `https://api.flutterwave.com/v3/transactions/${lookupId}/verify`,
          { headers: { Authorization: `Bearer ${flwSecretKey}` } },
        );
        const flwJson = await flwRes.json();

        if (flwRes.ok && flwJson.data?.status === "successful") {
          const verifiedData = flwJson.data;
          const metaSubscriptionId = verifiedData.meta?.subscriptionId;
          const metaPlanId = verifiedData.meta?.planId;

          // Check if already processed
          const existingTx = await prisma.billingTransaction.findUnique({
            where: { flwTransactionId: String(verifiedData.id) },
          });

          if (!existingTx && metaSubscriptionId && metaPlanId) {
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

            await processSubscriptionPayment({
              schoolId,
              subscriptionId: metaSubscriptionId,
              planId: metaPlanId,
              amount: Number(verifiedData.amount),
              flwTransactionId: String(verifiedData.id),
              flwCustomerId: String(verifiedData.customer?.id ?? ""),
              cardToken,
              billingPeriod: "term",
            });
          }
        }
      }

      return NextResponse.redirect(
        new URL("/admin/settings/subscription?flutterwave_status=success", request.url),
      );
    }

    // Payment cancelled or failed
    return NextResponse.redirect(
      new URL(
        `/admin/settings/subscription?flutterwave_status=${status ?? "cancelled"}`,
        request.url,
      ),
    );
  } catch (err) {
    console.error("[subscription/verify] Failed:", err);
    return NextResponse.redirect(
      new URL("/admin/settings/subscription?flutterwave_status=error", request.url),
    );
  }
}
