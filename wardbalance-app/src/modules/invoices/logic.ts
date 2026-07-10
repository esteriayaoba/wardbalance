import { Prisma } from "@/generated/prisma/client";

export function calculateCarryover(
  previousInvoice: { balanceDue: Prisma.Decimal } | null
): Prisma.Decimal {
  if (!previousInvoice) return new Prisma.Decimal(0);
  return previousInvoice.balanceDue;
}

export function checkDuplicate(
  existingInvoice: { id: string } | null,
  currentStatus?: string
): { duplicate: boolean; reason: string | null } {
  if (!existingInvoice) return { duplicate: false, reason: null };
  if (currentStatus === "skip") {
    return { duplicate: true, reason: "skipped" };
  }
  return { duplicate: true, reason: "duplicate" };
}

export function hasExistingInvoice(
  existingSet: Set<string>,
  studentId: string
): boolean {
  return existingSet.has(studentId);
}

export function validatePayment(
  amount: Prisma.Decimal,
  balanceDue: Prisma.Decimal
): { valid: boolean; error: string | null } {
  if (amount.lessThanOrEqualTo(0)) {
    return { valid: false, error: "Payment amount must be positive." };
  }
  if (amount.greaterThan(balanceDue)) {
    return { valid: false, error: "Payment amount exceeds balance due." };
  }
  return { valid: true, error: null };
}

export function deriveStatusAfterPayment(
  currentStatus: string,
  amountPaid: Prisma.Decimal,
  finalAmount: Prisma.Decimal
): string {
  if (amountPaid.equals(0)) return currentStatus;
  if (amountPaid.greaterThanOrEqualTo(finalAmount)) return "paid";
  return "partial";
}
