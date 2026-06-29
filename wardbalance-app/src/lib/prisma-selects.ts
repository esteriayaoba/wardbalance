import { Prisma } from "@/generated/prisma/client";

export const studentBasicSelect = {
  id: true,
  firstName: true,
  lastName: true,
  admissionNumber: true,
  classLevel: { select: { name: true } },
  classArm: { select: { name: true } },
} satisfies Prisma.StudentSelect;

export const parentBasicSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
} satisfies Prisma.ParentSelect;

export const invoiceBasicSelect = {
  id: true,
  status: true,
  dueDate: true,
  finalAmount: true,
  amountPaid: true,
  balanceDue: true,
  term: { select: { name: true } },
} satisfies Prisma.InvoiceSelect;

export const invoiceBalanceSelect = {
  id: true,
  status: true,
  amountPaid: true,
  balanceDue: true,
  finalAmount: true,
} satisfies Prisma.InvoiceSelect;

export const termWithSessionSelect = {
  id: true,
  name: true,
  isActive: true,
  status: true,
  session: { select: { name: true } },
} satisfies Prisma.AcademicTermSelect;
