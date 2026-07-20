import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export interface ProcessSubscriptionPaymentInput {
  schoolId: string;
  subscriptionId: string;
  planId: string;
  amount: number;
  flwTransactionId: string;
  flwCustomerId: string;
  cardToken: {
    token: string;
    last4: string;
    brand: string;
    expiry: string;
  } | null;
  billingPeriod: string | null;
}

export interface ProcessSubscriptionPaymentOutput {
  subscription: { id: string; status: string; planId: string };
  invoice: { id: string; invoiceNumber: string; amount: number; status: string };
  transaction: { id: string; status: string };
}

function generateInvoiceNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-SUB-${dateStr}-${rand}`;
}

/**
 * Process a verified Flutterwave subscription payment atomically.
 *
 * 1. Updates SchoolSubscription (status, card token, period)
 * 2. Creates SubscriptionInvoice (paid)
 * 3. Creates BillingTransaction (success)
 * 4. Updates School planStatus
 * 5. Writes AuditLog
 *
 * Must be called after Flutterwave verification (webhook or verify endpoint).
 */
export async function processSubscriptionPayment(
  input: ProcessSubscriptionPaymentInput,
): Promise<ProcessSubscriptionPaymentOutput> {
  const {
    schoolId, subscriptionId, planId, amount,
    flwTransactionId, flwCustomerId, cardToken,
    billingPeriod,
  } = input;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch subscription + school for audit context
    const subscription = await tx.schoolSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, school: { select: { selectedPlan: true } } },
    });
    if (!subscription) throw new Error("Subscription not found");

    const previousStatus = subscription.status;
    const previousPlanId = subscription.planId;

    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // 2. Update SchoolSubscription
    const updatedSubscription = await tx.schoolSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: "active",
        planId,
        autoRenew: true,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        flwCustomerId: flwCustomerId || subscription.flwCustomerId,
        flwCardToken: cardToken
          ? (JSON.parse(JSON.stringify(cardToken)) as Prisma.InputJsonValue)
          : undefined,
      },
    });

    // 3. Update School planStatus for backward compatibility
    const planNameMap: Record<string, string> = {
      starter_free: "freemium",
      pro_term: "business",
      group_custom: "multi_school",
    };
    await tx.school.update({
      where: { id: schoolId },
      data: {
        selectedPlan: planNameMap[planId] ?? "freemium",
        planStatus: "active",
        trialEndsAt: null,
      },
    });

    // 4. Create SubscriptionInvoice
    const invoiceNumber = generateInvoiceNumber();
    const invoice = await tx.subscriptionInvoice.create({
      data: {
        subscriptionId,
        schoolId,
        invoiceNumber,
        planId,
        amount,
        currency: "NGN",
        status: "paid",
        periodStart,
        periodEnd,
        paidAt: new Date(),
        flwTransactionId,
      },
    });

    // 5. Create BillingTransaction
    const transaction = await tx.billingTransaction.create({
      data: {
        invoiceId: invoice.id,
        subscriptionId,
        schoolId,
        amount,
        currency: "NGN",
        paymentMethod: cardToken ? "card" : "bank_transfer",
        flwTransactionId,
        status: "success",
      },
    });

    // 6. Write AuditLog
    await tx.auditLog.create({
      data: {
        schoolId,
        actorId: "flw-webhook",
        actorName: "Flutterwave Webhook",
        action: "subscription_payment_processed",
        entityType: "SchoolSubscription",
        entityId: subscriptionId,
        previousValue: JSON.parse(JSON.stringify({
          status: previousStatus,
          planId: previousPlanId,
          trialEndsAt: subscription.trialEndsAt,
        })),
        newValue: JSON.parse(JSON.stringify({
          status: "active",
          planId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          invoiceNumber,
          flwTransactionId,
          hasCardToken: !!cardToken,
        })),
      },
    });

    return {
      subscription: { id: updatedSubscription.id, status: updatedSubscription.status, planId: updatedSubscription.planId },
      invoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber, amount: Number(invoice.amount), status: invoice.status },
      transaction: { id: transaction.id, status: transaction.status },
    };
  });

  return result;
}
