import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { Prisma, InvoiceStatus } from "@/generated/prisma/client";
import { logError } from "@/lib/logger";
import { getOverdueStats } from "@/lib/invoices/overdue";

export async function GET(_request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const schoolId = guard.session.schoolId;

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

    const nonDraftStatuses: InvoiceStatus[] = ["issued", "partial", "paid", "overdue"];

    const [totalInvoices, expectedAgg, collectedAgg, studentsWithoutParentsCount, recentActivity, overdueStats] =
      await Promise.all([
        prisma.invoice.count({
          where: { schoolId, status: { in: nonDraftStatuses }, ...(activeTerm ? { termId: activeTerm.id } : {}) },
        }),
        prisma.invoice.aggregate({
          where: { schoolId, status: { in: nonDraftStatuses }, ...(activeTerm ? { termId: activeTerm.id } : {}) },
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
              where: { schoolId, termId: activeTerm.id, status: { in: nonDraftStatuses } },
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
        getOverdueStats(schoolId),
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
          overdue: overdueStats,
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
