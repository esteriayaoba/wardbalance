import { prisma } from "@/lib/prisma";
import { Prisma, PaymentMethod } from "@/generated/prisma/client";
import { resolveParentId } from "@/modules/payments/resolve-parent";
import { validatePayment, deriveStatusAfterPayment } from "@/modules/invoices/logic";

const RECEIPT_NUMBER_REGEX = /^[A-Z0-9_-]{3,10}-\d{8}-[A-Z0-9]{4}$/;

function generateReceiptNumber(prefix = "REC"): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const number = `${prefix}-${dateStr}-${rand}`;

  if (!RECEIPT_NUMBER_REGEX.test(number)) {
    throw new Error(`Generated receipt number "${number}" does not match expected format`);
  }

  return number;
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

    const validation = validatePayment(amount, invoice.balanceDue);
    if (!validation.valid) throw new Error(validation.error!);

    const payment = await tx.payment.create({
      data: {
        schoolId, invoiceId, studentId, parentId, amount, method,
        status: "recorded", reference, recordedById,
      },
    });

    const newAmountPaid = invoice.amountPaid.plus(amount);
    const newBalanceDue = invoice.balanceDue.minus(amount);

    const newStatus = deriveStatusAfterPayment(invoice.status, newAmountPaid, invoice.finalAmount) as "draft" | "issued" | "partial" | "paid" | "overdue";

    const updateResult = await tx.invoice.updateMany({
      where: { id: invoiceId, balanceDue: invoice.balanceDue },
      data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, status: newStatus },
    });

    if (updateResult.count === 0) {
      throw new Error(
        "Invoice balance changed since payment was initiated. " +
        "This may be due to a concurrent payment being processed. Please refresh and try again."
      );
    }

    const updatedInvoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, amountPaid: true, balanceDue: true, status: true },
    });
    if (!updatedInvoice) throw new Error("Invoice not found after update");

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

export { generateReceiptNumber, resolveParentId };
