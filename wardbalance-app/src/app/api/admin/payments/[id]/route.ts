import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function PUT(
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
    const body = await request.json();

    if (body.action !== "void") {
      return NextResponse.json(
        { error: "Unsupported payment action. Only 'void' is allowed.", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    // Fetch the payment
    const payment = await prisma.payment.findFirst({
      where: { id, schoolId: session.schoolId },
      include: {
        invoice: {
          include: {
            term: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (payment.status === "void") {
      return NextResponse.json(
        { error: "Payment is already voided.", code: "CONFLICT" },
        { status: 409 }
      );
    }

    if (payment.invoice.term.status === "locked") {
      return NextResponse.json(
        { error: "Cannot void a payment in a locked term.", code: "TERM_LOCKED" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Mark payment as void
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: { status: "void" },
      });

      // Recalculate invoice totals
      const newAmountPaid = payment.invoice.amountPaid.minus(payment.amount);
      const newBalanceDue = payment.invoice.balanceDue.plus(payment.amount);

      let newStatus: any = payment.invoice.status;
      if (newAmountPaid.equals(0)) {
        // If due date has passed, it should go to overdue, otherwise issued
        const now = new Date();
        const dueDate = new Date(payment.invoice.dueDate);
        newStatus = now > dueDate ? "overdue" : "issued";
      } else {
        newStatus = "partial";
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: "PAYMENT_VOIDED",
          entityType: "Payment",
          entityId: id,
          previousValue: JSON.parse(JSON.stringify(payment)),
          newValue: JSON.parse(
            JSON.stringify({
              payment: updatedPayment,
              invoiceState: {
                previousAmountPaid: payment.invoice.amountPaid,
                previousBalanceDue: payment.invoice.balanceDue,
                newAmountPaid,
                newBalanceDue,
                newStatus,
              },
            })
          ),
        },
      });

      return { payment: updatedPayment, invoice: updatedInvoice };
    });

    return NextResponse.json({
      data: result,
      message: "Payment successfully voided.",
    });
  } catch (err: any) {
    console.error("[payments/[id]] PUT error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
