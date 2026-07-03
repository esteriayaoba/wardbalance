import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const VoidPaymentSchema = z.object({
  action: z.literal("void"),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = VoidPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Unsupported payment action. Only 'void' is allowed.", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: { id, schoolId: guard.session.schoolId },
      include: {
        invoice: {
          include: { term: { select: { status: true } } },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (payment.status === "void") {
      return NextResponse.json({ error: "Payment is already void.", code: "ALREADY_VOID" }, { status: 409 });
    }

    if (payment.invoice.term.status === "locked") {
      return NextResponse.json({ error: "Cannot void a payment in a locked term.", code: "TERM_LOCKED" }, { status: 409 });
    }

    const invoice = payment.invoice;

    await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: { status: "void" },
      });

      const newAmountPaid = invoice.amountPaid.minus(payment.amount);
      const newBalanceDue = invoice.balanceDue.plus(payment.amount);

      let newStatus: "draft" | "issued" | "partial" | "paid" | "overdue" = invoice.status;
      if (newAmountPaid.equals(0) && newBalanceDue.greaterThan(0)) {
        // Check if the invoice is overdue
        const now = new Date();
        if (invoice.dueDate && now > invoice.dueDate) {
          newStatus = "overdue";
        } else {
          newStatus = "issued";
        }
      } else if (newAmountPaid.greaterThan(0) && newBalanceDue.greaterThan(0)) {
        newStatus = "partial";
      } else if (newBalanceDue.equals(0)) {
        newStatus = "paid";
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, status: newStatus },
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName,
          action: "PAYMENT_VOIDED",
          entityType: "Payment",
          entityId: id,
          previousValue: JSON.parse(JSON.stringify({
            payment: { status: payment.status, amount: payment.amount, method: payment.method },
            invoiceState: {
              amountPaid: invoice.amountPaid,
              balanceDue: invoice.balanceDue,
              status: invoice.status,
            },
          })),
          newValue: JSON.parse(JSON.stringify({
            payment: { status: "void", amount: payment.amount, method: payment.method },
            invoiceState: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, status: newStatus },
          })),
        },
      });
    });

    return NextResponse.json({ message: "Payment voided successfully." });
  } catch (err) {
    return NextResponse.json({ error: "Failed to void payment", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
