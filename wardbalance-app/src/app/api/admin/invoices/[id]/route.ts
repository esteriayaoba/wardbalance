import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["issued"],
  issued: [],
  partial: [],
  paid: [],
  overdue: [],
};

const UpdateInvoiceSchema = z.object({
  status: z.enum(["draft", "issued", "partial", "paid", "overdue"]).optional(),
  dueDate: z.string().optional(),
  discountType: z.enum(["fixed", "percentage", "none"]).optional(),
  discountValue: z.number().nonnegative().optional(),
});

function validateStatusTransition(current: string, next: string | undefined): string | null {
  if (!next) return null;
  if (current === next) return null;
  const allowed = ALLOWED_STATUS_TRANSITIONS[current];
  if (!allowed) return `Cannot transition from ${current}`;
  if (!allowed.includes(next)) return `Cannot transition invoice from "${current}" to "${next}". Allowed transitions from "${current}": ${allowed.join(", ") || "none"}.`;
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, schoolId: guard.session.schoolId },
      include: {
        student: {
          include: {
            classLevel: true,
            classArm: true,
            parents: {
              include: { parent: true },
            },
          },
        },
        term: {
          include: { session: true },
        },
        lineItems: true,
        payments: {
          where: { status: "recorded" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ data: invoice });
  } catch (err) {
    logError("invoices/[id] GET", err);
    return NextResponse.json({ error: "An unexpected error occurred", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, schoolId: guard.session.schoolId },
      include: { lineItems: true },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const { status, dueDate, discountType, discountValue } = parsed.data;

    // Validate status transition
    const transitionError = validateStatusTransition(existingInvoice.status, status);
    if (transitionError) {
      return NextResponse.json({ error: transitionError, code: "INVALID_TRANSITION" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let finalDiscountAmount = new Prisma.Decimal(existingInvoice.discountAmount);
      let isDiscountUpdated = false;

      if (discountType !== undefined) {
        isDiscountUpdated = true;
        await tx.invoiceLineItem.deleteMany({
          where: { invoiceId: id, lineType: "discount" },
        });

        if (discountType === "none" || !discountValue || discountValue === 0) {
          finalDiscountAmount = new Prisma.Decimal(0);
        } else {
          if (discountType === "fixed") {
            finalDiscountAmount = new Prisma.Decimal(discountValue);
          } else if (discountType === "percentage") {
            const baseAmount = existingInvoice.lineItems
              .filter((item) => item.lineType !== "discount")
              .reduce((acc, item) => acc.plus(item.amount), new Prisma.Decimal(0));

            finalDiscountAmount = baseAmount.times(discountValue).dividedBy(100);
          }

          await tx.invoiceLineItem.create({
            data: {
              invoiceId: id,
              name: `Discount (${discountType === "percentage" ? `${discountValue}%` : "Fixed"})`,
              amount: finalDiscountAmount.negated(),
              lineType: "discount",
            },
          });
        }
      }

      const freshLineItems = await tx.invoiceLineItem.findMany({ where: { invoiceId: id } });

      const totalAmount = freshLineItems
        .filter((item) => item.lineType !== "discount")
        .reduce((acc, item) => acc.plus(item.amount), new Prisma.Decimal(0));

      const finalAmount = totalAmount.minus(finalDiscountAmount);
      const balanceDue = finalAmount.minus(existingInvoice.amountPaid);

      // Recalculate status based on discount changes only if a discount updated or no explicit status provided
      let updatedStatus = status ?? existingInvoice.status;
      if (isDiscountUpdated || status === undefined) {
        if (balanceDue.equals(0) && existingInvoice.amountPaid.greaterThan(0)) {
          updatedStatus = "paid";
        } else if (existingInvoice.amountPaid.greaterThan(0) && balanceDue.greaterThan(0)) {
          updatedStatus = "partial";
        } else if (existingInvoice.amountPaid.equals(0) && balanceDue.greaterThan(0)) {
          updatedStatus = existingInvoice.status === "paid" ? "issued" : existingInvoice.status;
        }
      }

      // Ensure no negative final amount
      const safeFinalAmount = Prisma.Decimal.max(0, finalAmount);
      const safeBalanceDue = Prisma.Decimal.max(0, balanceDue);

      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: updatedStatus,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          totalAmount,
          discountAmount: finalDiscountAmount,
          finalAmount: safeFinalAmount,
          balanceDue: safeBalanceDue,
        },
        include: { lineItems: true },
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName,
          action: "INVOICE_UPDATED",
          entityType: "Invoice",
          entityId: id,
          previousValue: JSON.parse(JSON.stringify(existingInvoice)),
          newValue: JSON.parse(JSON.stringify(updatedInvoice)),
        },
      });

      return updatedInvoice;
    });

    return NextResponse.json({ data: result, message: "Invoice updated successfully." });
  } catch (err: unknown) {
    logError("invoices/[id] PUT", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const { id } = await params;

    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, schoolId: guard.session.schoolId },
      include: {
        payments: { where: { status: "recorded" } },
      },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (existingInvoice.status !== "draft" && existingInvoice.status !== "issued") {
      return NextResponse.json(
        { error: "Only draft or issued invoices with no payments can be deleted.", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    if (existingInvoice.payments.length > 0) {
      return NextResponse.json(
        { error: "Invoice cannot be deleted because it has recorded payments.", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      await tx.invoice.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName,
          action: "INVOICE_DELETED",
          entityType: "Invoice",
          entityId: id,
          previousValue: JSON.parse(JSON.stringify(existingInvoice)),
        },
      });
    });

    return NextResponse.json({ message: "Invoice deleted successfully." });
  } catch (err: unknown) {
    logError("invoices/[id] DELETE", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
