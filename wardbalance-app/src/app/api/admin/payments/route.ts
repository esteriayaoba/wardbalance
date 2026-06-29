import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireVerifiedAdminUser } from "@/lib/auth/require-verified-admin";

// Generate unique receipt numbers
function generateReceiptNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REC-${dateStr}-${rand}`;
}

const CreatePaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.union([z.number(), z.string()]).transform((val) => new Prisma.Decimal(val)),
  method: z.enum(["cash", "bank_transfer", "pos", "cheque"]),
  reference: z.string().optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");

    const where: any = { schoolId: session.schoolId };
    if (invoiceId) where.invoiceId = invoiceId;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
            classLevel: { select: { name: true } },
            classArm: { select: { name: true } },
          },
        },
        recordedBy: {
          select: {
            fullName: true,
          },
        },
        receipts: {
          select: {
            receiptNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: payments });
  } catch (err) {
    console.error("[payments] GET error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireVerifiedAdminUser();
    if (!guard.authorized) {
      return guard.response;
    }
    const session = guard.session;

    const body = await request.json();
    const parsed = CreatePaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { invoiceId, amount, method, reference } = parsed.data;

    // Fetch Invoice details to verify
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId: session.schoolId },
      include: {
        term: true,
        student: {
          include: {
            parents: {
              where: { isPrimaryContact: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (invoice.term.status === "locked") {
      return NextResponse.json(
        { error: "Cannot record payment for an invoice in a locked term.", code: "TERM_LOCKED" },
        { status: 400 }
      );
    }

    if (amount.lessThanOrEqualTo(0)) {
      return NextResponse.json(
        { error: "Payment amount must be greater than zero.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (amount.greaterThan(invoice.balanceDue)) {
      return NextResponse.json(
        { error: `Payment amount exceeds invoice balance due (${formatNaira(invoice.balanceDue.toString())}).`, code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    // Resolve parentId if any linked parent exists
    const primaryParent = invoice.student.parents[0]?.parentId;
    let fallbackParentId: string | null = primaryParent || null;

    if (!fallbackParentId) {
      const anyParent = await prisma.parentWardLink.findFirst({
        where: { studentId: invoice.studentId },
      });
      fallbackParentId = anyParent?.parentId || null;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          schoolId: session.schoolId,
          invoiceId,
          studentId: invoice.studentId,
          parentId: fallbackParentId,
          amount,
          method,
          reference: reference || null,
          recordedById: session.userId,
        },
      });

      // Create Receipt
      const receiptNumber = generateReceiptNumber();
      const receipt = await tx.receipt.create({
        data: {
          schoolId: session.schoolId,
          paymentId: payment.id,
          receiptNumber,
        },
      });

      // Update Invoice
      const newAmountPaid = invoice.amountPaid.plus(amount);
      const newBalanceDue = invoice.balanceDue.minus(amount);

      let newStatus: any = invoice.status;
      if (newBalanceDue.equals(0)) {
        newStatus = "paid";
      } else if (newAmountPaid.greaterThan(0)) {
        newStatus = "partial";
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
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
          action: "PAYMENT_RECORDED",
          entityType: "Payment",
          entityId: payment.id,
          newValue: JSON.parse(
            JSON.stringify({
              payment,
              receipt,
              invoiceState: {
                previousAmountPaid: invoice.amountPaid,
                previousBalanceDue: invoice.balanceDue,
                newAmountPaid,
                newBalanceDue,
                newStatus,
              },
            })
          ),
        },
      });

      return { payment, receipt, invoice: updatedInvoice };
    });

    return NextResponse.json({
      data: result,
      message: "Payment successfully recorded.",
    });
  } catch (err: any) {
    console.error("[payments] POST error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// Helper formatting Naira function for warning string (uses standard Nigerian format)
function formatNaira(amount: string) {
  const num = parseFloat(amount);
  return `₦${num.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}
