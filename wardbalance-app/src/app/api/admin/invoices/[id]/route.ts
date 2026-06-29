import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireVerifiedAdminUser } from "@/lib/auth/require-verified-admin";

const UpdateInvoiceSchema = z.object({
  status: z.enum(["draft", "issued", "partial", "paid", "overdue"]).optional(),
  dueDate: z.string().optional(),
  discountType: z.enum(["fixed", "percentage", "none"]).optional(),
  discountValue: z.number().nonnegative().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, schoolId: session.schoolId },
      include: {
        student: {
          include: {
            classLevel: true,
            classArm: true,
            parents: {
              include: {
                parent: true,
              },
            },
          },
        },
        term: {
          include: {
            session: true,
          },
        },
        lineItems: true,
        payments: {
          where: { status: "recorded" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: invoice });
  } catch (err) {
    console.error("[invoices/[id]] GET error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireVerifiedAdminUser();
    if (!guard.authorized) {
      return guard.response;
    }
    const session = guard.session;

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
      where: { id, schoolId: session.schoolId },
      include: {
        lineItems: true,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: "Invoice not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const { status, dueDate, discountType, discountValue } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      let finalDiscountAmount = new Prisma.Decimal(existingInvoice.discountAmount);
      let isDiscountUpdated = false;

      // Apply/re-calculate discount
      if (discountType !== undefined) {
        isDiscountUpdated = true;
        // Clean up previous discount line items
        await tx.invoiceLineItem.deleteMany({
          where: { invoiceId: id, lineType: "discount" },
        });

        if (discountType === "none" || !discountValue || discountValue === 0) {
          finalDiscountAmount = new Prisma.Decimal(0);
        } else {
          // Calculate discount value
          if (discountType === "fixed") {
            finalDiscountAmount = new Prisma.Decimal(discountValue);
          } else if (discountType === "percentage") {
            // Percentage of the total baseline amount (sum of all items excluding discount itself)
            const baseAmount = existingInvoice.lineItems
              .filter((item) => item.lineType !== "discount")
              .reduce((acc, item) => acc.plus(item.amount), new Prisma.Decimal(0));

            finalDiscountAmount = baseAmount.times(discountValue).dividedBy(100);
          }

          // Insert discount line item
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

      // Recompute invoice amounts
      // Calculate total original amount (sum of all non-discount line items)
      const freshLineItems = await tx.invoiceLineItem.findMany({
        where: { invoiceId: id },
      });

      const totalAmount = freshLineItems
        .filter((item) => item.lineType !== "discount")
        .reduce((acc, item) => acc.plus(item.amount), new Prisma.Decimal(0));

      const finalAmount = totalAmount.minus(finalDiscountAmount);
      const balanceDue = finalAmount.minus(existingInvoice.amountPaid);

      // Determine updated status if balance changes
      let updatedStatus = status ?? existingInvoice.status;
      if (isDiscountUpdated || status === undefined) {
        if (balanceDue.equals(0) && existingInvoice.amountPaid.greaterThan(0)) {
          updatedStatus = "paid";
        } else if (existingInvoice.amountPaid.greaterThan(0) && balanceDue.greaterThan(0)) {
          updatedStatus = "partial";
        } else if (existingInvoice.amountPaid.equals(0) && balanceDue.greaterThan(0) && existingInvoice.status === "paid") {
          updatedStatus = "issued";
        }
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: updatedStatus,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          totalAmount,
          discountAmount: finalDiscountAmount,
          finalAmount,
          balanceDue,
        },
        include: {
          lineItems: true,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: "INVOICE_UPDATED",
          entityType: "Invoice",
          entityId: id,
          previousValue: JSON.parse(JSON.stringify(existingInvoice)),
          newValue: JSON.parse(JSON.stringify(updatedInvoice)),
        },
      });

      return updatedInvoice;
    });

    return NextResponse.json({
      data: result,
      message: "Invoice updated successfully.",
    });
  } catch (err: any) {
    console.error("[invoices/[id]] PUT error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireVerifiedAdminUser();
    if (!guard.authorized) {
      return guard.response;
    }
    const session = guard.session;

    const { id } = await params;

    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, schoolId: session.schoolId },
      include: {
        payments: {
          where: { status: "recorded" },
        },
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: "Invoice not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Only allow deletion of draft invoices or issued invoices with no recorded payments
    if (existingInvoice.status !== "draft" && existingInvoice.status !== "issued") {
      return NextResponse.json(
        { error: "Invoices that have been partially or fully paid cannot be deleted.", code: "BAD_REQUEST" },
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
      // Cascade delete line items
      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      await tx.invoice.delete({ where: { id } });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: "INVOICE_DELETED",
          entityType: "Invoice",
          entityId: id,
          previousValue: JSON.parse(JSON.stringify(existingInvoice)),
        },
      });
    });

    return NextResponse.json({
      message: "Invoice deleted successfully.",
    });
  } catch (err: any) {
    console.error("[invoices/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
