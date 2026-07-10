import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { recordPayment } from "@/modules/payments/recorder.service";

export interface FlutterwavePaymentData {
  tx_ref: string;
  id: number;
  amount: number;
  currency: string;
  meta: {
    invoiceId: string;
    schoolId: string;
    parentId: string;
  };
}

export async function processFlutterwavePayment(data: FlutterwavePaymentData) {
  const { tx_ref, id: transactionId, amount, meta } = data;
  const { invoiceId, schoolId, parentId } = meta;

  const existing = await prisma.payment.findFirst({
    where: { reference: tx_ref, schoolId },
  });
  if (existing) {
    return { duplicate: true, message: "Duplicate webhook — already processed" };
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, schoolId },
    select: { id: true, studentId: true },
  });
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  return recordPayment({
    schoolId,
    invoiceId,
    studentId: invoice.studentId,
    parentId,
    amount: new Prisma.Decimal(amount),
    method: "bank_transfer",
    reference: tx_ref,
    recordedById: null,
    actorId: parentId || "webhook",
    actorName: "Flutterwave Webhook",
    action: "PAYMENT_RECORDED",
    receiptPrefix: "FLW",
  });
}
