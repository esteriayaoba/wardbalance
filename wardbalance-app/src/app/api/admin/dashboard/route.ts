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

    // 1. Total invoices generated
    const totalInvoices = await prisma.invoice.count({
      where: { schoolId },
    });

    // 2. Expected revenue (sum of all finalAmount)
    const expectedAgg = await prisma.invoice.aggregate({
      where: { schoolId },
      _sum: {
        finalAmount: true,
      },
    });
    const expectedRevenue = expectedAgg._sum.finalAmount ?? new Prisma.Decimal(0);

    // 3. Collected revenue (sum of all payment amount where status is recorded)
    const collectedAgg = await prisma.payment.aggregate({
      where: { schoolId, status: "recorded" },
      _sum: {
        amount: true,
      },
    });
    const collectedRevenue = collectedAgg._sum.amount ?? new Prisma.Decimal(0);

    // 4. Outstanding balance
    const outstandingBalance = expectedRevenue.minus(collectedRevenue);

    // 5. Students without linked parents (count of students where parents list is empty)
    const studentsWithoutParentsCount = await prisma.student.count({
      where: {
        schoolId,
        parents: {
          none: {},
        },
      },
    });

    // Fetch last 5 audit logs for recent activity feed
    const recentActivity = await prisma.auditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      data: {
        schoolStatus: school.status,
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
