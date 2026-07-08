import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { parsePagination, paginatedJsonResponse } from "@/lib/server/pagination";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");
    const { limit, offset } = parsePagination(searchParams, { defaultLimit: 50, maxLimit: 200 });

    const where: Record<string, unknown> = { schoolId: guard.session.schoolId };
    if (paymentId) where.paymentId = paymentId;

    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
        where,
        include: {
          payment: {
            include: {
              student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
              invoice: { select: { id: true, status: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.receipt.count({ where }),
    ]);

    return NextResponse.json(paginatedJsonResponse(receipts, total, limit, offset));
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch receipts", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
