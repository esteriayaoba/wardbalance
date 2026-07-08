import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { z } from "zod";
import { Prisma, PaymentMethod, PaymentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";
import { recordManualPayment } from "@/services/payment-verification.service";
import { studentBasicSelect } from "@/lib/prisma-selects";
import { parsePagination, paginatedJsonResponse } from "@/lib/server/pagination";

const CreatePaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.union([z.number(), z.string()]).transform((val) => {
    const decimal = new Prisma.Decimal(val);
    if (decimal.lessThanOrEqualTo(0)) throw new Error("Payment amount must be positive");
    return decimal;
  }),
  method: z.enum(["cash", "bank_transfer", "pos", "cheque"]),
  reference: z.string().optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    const search = searchParams.get("search");
    const method = searchParams.get("method");
    const status = searchParams.get("status");

    const where: Prisma.PaymentWhereInput = { schoolId: guard.session.schoolId };
    if (invoiceId) where.invoiceId = invoiceId;
    if (method) where.method = method as PaymentMethod;
    if (status) where.status = status as PaymentStatus;
    if (search) {
      where.OR = [
        { student: { firstName: { contains: search, mode: "insensitive" } } },
        { student: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const { limit, offset } = parsePagination(searchParams);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          invoice: { select: { id: true, status: true } },
          student: { select: studentBasicSelect },
          receipts: { select: { id: true, receiptNumber: true } },
          recordedBy: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json(paginatedJsonResponse(payments, total, limit, offset));
  } catch (err) {
    logError("payments GET", err);
    return NextResponse.json({ error: "Failed to fetch payments", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = CreatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { invoiceId, amount, method, reference } = parsed.data;

    const result = await recordManualPayment({
      schoolId: guard.session.schoolId,
      actorId: guard.session.userId,
      actorName: guard.session.fullName,
      invoiceId,
      amount: amount as Prisma.Decimal,
      method,
      reference: reference || undefined,
    });

    return NextResponse.json({ data: result, message: "Payment recorded successfully." }, { status: 201 });
  } catch (err) {
    logError("payments POST", err);
    const message = err instanceof Error ? err.message : "Failed to record payment";
    return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
