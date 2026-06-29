import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { logError } from "@/lib/logger";

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const schoolId = session.schoolId;

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

    const activeTerm = await prisma.academicTerm.findFirst({
      where: { schoolId, isActive: true },
      include: { session: { select: { name: true } } },
    });

    const termFilter = activeTerm ? { termId: activeTerm.id } : {};

    const [totalInvoices, expectedAgg, collectedAgg, studentsWithoutParentsCount, recentActivity] =
      await Promise.all([
        prisma.invoice.count({
          where: { schoolId, ...termFilter },
        }),
        prisma.invoice.aggregate({
          where: { schoolId, ...termFilter },
          _sum: { finalAmount: true },
        }),
        (async () => {
          if (!activeTerm) {
            return prisma.payment.aggregate({
              where: { schoolId, status: "recorded" },
              _sum: { amount: true },
            });
          }
          const invoiceIds = (
            await prisma.invoice.findMany({
              where: { schoolId, termId: activeTerm.id },
              select: { id: true },
            })
          ).map((i) => i.id);
          return prisma.payment.aggregate({
            where: { schoolId, status: "recorded", invoiceId: { in: invoiceIds } },
            _sum: { amount: true },
          });
        })(),
        prisma.student.count({
          where: { schoolId, parents: { none: {} } },
        }),
        prisma.auditLog.findMany({
          where: { schoolId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    const expectedRevenue = expectedAgg._sum.finalAmount ?? new Prisma.Decimal(0);
    const collectedRevenue = collectedAgg._sum.amount ?? new Prisma.Decimal(0);
    const outstandingBalance = expectedRevenue.minus(collectedRevenue);

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
  } catch (err) {
    logError("dashboard", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
