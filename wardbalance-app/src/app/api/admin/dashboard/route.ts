import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const schoolId = session.schoolId;

    // Fetch school to verify status
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { status: true },
    });

    if (!school) {
      return NextResponse.json(
        { error: "School not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Fetch active term for scoping
    const activeTerm = await prisma.academicTerm.findFirst({
      where: { schoolId, isActive: true },
      include: { session: { select: { name: true } } },
    });

    // 1. Total invoices generated (scoped to active term if available)
    const totalInvoices = await prisma.invoice.count({
      where: { schoolId, ...(activeTerm ? { termId: activeTerm.id } : {}) },
    });

    // 2. Expected revenue (scoped to active term)
    const expectedAgg = await prisma.invoice.aggregate({
      where: { schoolId, ...(activeTerm ? { termId: activeTerm.id } : {}) },
      _sum: { finalAmount: true },
    });
    const expectedRevenue = expectedAgg._sum.finalAmount ?? new Prisma.Decimal(0);

    // 3. Collected revenue (scoped to active term's invoices)
    const invoiceIds = activeTerm
      ? (await prisma.invoice.findMany({
          where: { schoolId, termId: activeTerm.id },
          select: { id: true },
        })).map((i) => i.id)
      : null;

    const collectedAgg = await prisma.payment.aggregate({
      where: invoiceIds
        ? { schoolId, status: "recorded", invoiceId: { in: invoiceIds } }
        : { schoolId, status: "recorded" },
      _sum: { amount: true },
    });
    const collectedRevenue = collectedAgg._sum.amount ?? new Prisma.Decimal(0);

    // 4. Outstanding balance
    const outstandingBalance = expectedRevenue.minus(collectedRevenue);

    // 5. Students without linked parents
    const studentsWithoutParentsCount = await prisma.student.count({
      where: { schoolId, parents: { none: {} } },
    });

    // Last 5 audit logs
    const recentActivity = await prisma.auditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      data: {
        schoolStatus: school.status,
        activeTerm: activeTerm
          ? { name: activeTerm.name, sessionName: activeTerm.session.name }
          : null,
        stats: {
          totalInvoices,
          expectedRevenue: expectedRevenue.toString(),
          collectedRevenue: collectedRevenue.toString(),
          outstandingBalance: outstandingBalance.toString(),
          studentsWithoutParents: studentsWithoutParentsCount,
        },
        recentActivity,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("[dashboard] GET error:", err);
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
