import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireVerifiedAdminUser } from "@/lib/auth/require-verified-admin";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";
import { recordManualPayment } from "@/services/payment-verification.service";
import { enqueueNotification } from "@/lib/notifications";
import { studentBasicSelect } from "@/lib/prisma-selects";

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

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (invoiceId) where.invoiceId = invoiceId;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        student: { select: studentBasicSelect },
        recordedBy: { select: { fullName: true } },
        receipts: { select: { receiptNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: payments });
  } catch (err) {
    logError("payments GET", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireVerifiedAdminUser();
    if (!guard.authorized) return guard.response;
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

    try {
      const result = await recordManualPayment({
        schoolId: session.schoolId,
        actorId: session.userId,
        actorName: session.fullName,
        invoiceId,
        amount,
        method,
        reference,
      });

      try {
        const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (inv) {
          const parent = await prisma.parentWardLink.findFirst({
            where: { studentId: inv.studentId, schoolId: session.schoolId, isPrimaryContact: true },
            include: { parent: { select: { id: true, email: true, phone: true } } },
          });
          if (parent?.parent) {
            await enqueueNotification({
              schoolId: session.schoolId,
              parentId: parent.parent.id,
              channel: "email",
              recipient: parent.parent.email || parent.parent.phone,
              subject: "Payment Recorded — WardBalance",
              content: `A payment of ₦${Number(amount.toString()).toLocaleString("en-NG")} has been recorded for your ward.`,
              reference: `payment-${invoiceId}`,
            });
          }
        }
      } catch {
        // Non-blocking
      }

      return NextResponse.json({
        data: result,
        message: "Payment successfully recorded.",
      });
    } catch (serviceErr) {
      const message = serviceErr instanceof Error ? serviceErr.message : "Payment recording failed";
      const code = message.includes("Term is locked") ? "TERM_LOCKED" : "BAD_REQUEST";
      return NextResponse.json({ error: message, code }, { status: 400 });
    }
  } catch (err) {
    logError("payments POST", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
