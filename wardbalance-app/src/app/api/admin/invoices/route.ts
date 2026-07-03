import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const termId = searchParams.get("termId");
    const classLevelId = searchParams.get("classLevelId");
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { schoolId: guard.session.schoolId };
    if (termId) where.termId = termId;
    if (classLevelId) {
      where.student = { classLevelId };
    }
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          student: {
            include: {
              classLevel: { select: { name: true } },
              classArm: { select: { name: true } },
            },
          },
          term: { select: { name: true, session: { select: { name: true } } } },
          payments: {
            where: { status: "recorded" },
            select: { amount: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({ data: invoices, meta: { total, limit, offset } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch invoices", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
