import { prisma } from "@/lib/prisma";
import { Prisma, PaymentMethod } from "@/generated/prisma/client";

function generateReceiptNumber(prefix = "REC"): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${rand}`;
}

export interface RecordPaymentInput {
  schoolId: string;
  invoiceId: string;
  studentId: string;
  parentId: string | null;
  amount: Prisma.Decimal;
  method: PaymentMethod;
  reference: string | null;
  recordedById: string | null;
  actorId: string;
  actorName: string;
  action: string;
  receiptPrefix?: string;
  tx?: Prisma.TransactionClient;
}

export interface RecordPaymentOutput {
  payment: {
    id: string;
    amount: Prisma.Decimal;
    method: PaymentMethod;
    reference: string | null;
  };
  receipt: {
    id: string;
    receiptNumber: string;
  };
  invoice: {
    id: string;
    amountPaid: Prisma.Decimal;
    balanceDue: Prisma.Decimal;
    status: string;
  };
}

export async function recordPayment(input: RecordPaymentInput): Promise<RecordPaymentOutput> {
  const {
    schoolId, invoiceId, studentId, parentId, amount, method,
    reference, recordedById, actorId, actorName, action, receiptPrefix,
    tx: externalTx,
  } = input;

  const execute = async (tx: Prisma.TransactionClient) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, amountPaid: true, balanceDue: true, finalAmount: true, status: true },
    });

    if (!invoice) throw new Error("Invoice not found");
    if (amount.lessThanOrEqualTo(0)) throw new Error("Payment amount must be positive");
    if (amount.greaterThan(invoice.balanceDue)) throw new Error("Payment amount exceeds balance due");

    const payment = await tx.payment.create({
      data: {
        schoolId, invoiceId, studentId, parentId, amount, method,
        status: "recorded", reference, recordedById,
      },
    });

    const newAmountPaid = invoice.amountPaid.plus(amount);
    const newBalanceDue = invoice.balanceDue.minus(amount);

    let newStatus: "draft" | "issued" | "partial" | "paid" | "overdue" = invoice.status;
    if (newBalanceDue.equals(0)) newStatus = "paid";
    else if (newAmountPaid.greaterThan(0)) newStatus = "partial";

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, status: newStatus },
    });

    const receiptNumber = generateReceiptNumber(receiptPrefix);
    const receipt = await tx.receipt.create({
      data: { schoolId, paymentId: payment.id, receiptNumber },
    });

    await tx.auditLog.create({
      data: {
        schoolId, actorId, actorName, action,
        entityType: "Payment", entityId: payment.id,
        newValue: JSON.parse(JSON.stringify({
          payment: { id: payment.id, amount, method, reference },
          receipt: { id: receipt.id, receiptNumber },
          invoiceState: {
            previousAmountPaid: invoice.amountPaid,
            previousBalanceDue: invoice.balanceDue,
            newAmountPaid, newBalanceDue, newStatus,
          },
        })),
      },
    });

    return {
      payment: { id: payment.id, amount: payment.amount, method: payment.method, reference: payment.reference },
      receipt: { id: receipt.id, receiptNumber },
      invoice: { id: updatedInvoice.id, amountPaid: updatedInvoice.amountPaid, balanceDue: updatedInvoice.balanceDue, status: updatedInvoice.status },
    };
  };

  if (externalTx) {
    return execute(externalTx);
  }

  const [result] = await prisma.$transaction(async (tx) => [await execute(tx)]);
  return result;
}

async function resolveParentId(schoolId: string, studentId: string): Promise<string | null> {
  const primary = await prisma.parentWardLink.findFirst({
    where: { studentId, schoolId, isPrimaryContact: true },
  });
  if (primary) return primary.parentId;

  const anyLink = await prisma.parentWardLink.findFirst({
    where: { studentId, schoolId },
  });
  return anyLink?.parentId || null;
}

export { generateReceiptNumber, resolveParentId };
