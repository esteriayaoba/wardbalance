import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { logError } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const schoolId = guard.session.schoolId;
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "revenue_summary";
    const termId = searchParams.get("termId") || undefined;
    const classLevelId = searchParams.get("classLevelId") || undefined;

    if (reportType === "revenue_summary") {
      const terms = await prisma.academicTerm.findMany({
        where: { schoolId },
        include: {
          session: { select: { name: true } },
        },
        orderBy: { startDate: "desc" },
      });

      const invoiceGroups = await prisma.invoice.groupBy({
        by: ["termId"],
        where: { schoolId },
        _sum: {
          finalAmount: true,
          amountPaid: true,
          balanceDue: true,
        },
      });

      const aggregateMap = new Map(
        invoiceGroups.map((g) => [
          g.termId,
          {
            expected: g._sum.finalAmount ?? new Prisma.Decimal(0),
            collected: g._sum.amountPaid ?? new Prisma.Decimal(0),
            outstanding: g._sum.balanceDue ?? new Prisma.Decimal(0),
          },
        ])
      );

      const data = terms.map((term) => {
        const aggs = aggregateMap.get(term.id) ?? {
          expected: new Prisma.Decimal(0),
          collected: new Prisma.Decimal(0),
          outstanding: new Prisma.Decimal(0),
        };

        return {
          termId: term.id,
          termName: term.name,
          sessionName: term.session.name,
          expected: aggs.expected.toString(),
          collected: aggs.collected.toString(),
          outstanding: aggs.outstanding.toString(),
        };
      });

      return NextResponse.json({ data });
    }

    if (reportType === "debtors") {
      const where: Record<string, unknown> = { schoolId, balanceDue: { gt: 0 }, status: { in: ["issued", "partial", "overdue"] } };
      if (termId) where.termId = termId;
      if (classLevelId) where.student = { classLevelId };

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          student: {
            select: {
              firstName: true, lastName: true, admissionNumber: true,
              classLevel: { select: { name: true } },
              classArm: { select: { name: true } },
            },
          },
          term: { select: { name: true, session: { select: { name: true } } } },
        },
        orderBy: { balanceDue: "desc" },
      });

      const data = invoices.map((inv) => ({
        invoiceId: inv.id,
        studentName: `${inv.student.lastName}, ${inv.student.firstName}`,
        admissionNumber: inv.student.admissionNumber,
        className: `${inv.student.classLevel.name} — ${inv.student.classArm.name}`,
        termName: `${inv.term.session.name} — ${inv.term.name}`,
        expected: inv.finalAmount.toString(),
        collected: inv.amountPaid.toString(),
        outstanding: inv.balanceDue.toString(),
        dueDate: inv.dueDate,
        status: inv.status,
      }));

      return NextResponse.json({ data });
    }

    if (reportType === "class_summary") {
      const classArms = await prisma.classArm.findMany({
        where: { schoolId },
        include: {
          classLevel: { select: { name: true } },
        },
        orderBy: { classLevel: { name: "asc" } },
      });

      const activeStudents = await prisma.student.findMany({
        where: { schoolId, status: "active" },
        select: { id: true, classArmId: true },
      });

      const studentIds = activeStudents.map((s) => s.id);

      const invoiceGroups = await prisma.invoice.groupBy({
        by: ["studentId"],
        where: {
          schoolId,
          studentId: { in: studentIds },
          ...(termId ? { termId } : {}),
        },
        _sum: {
          finalAmount: true,
          amountPaid: true,
          balanceDue: true,
        },
      });

      const studentAggMap = new Map(
        invoiceGroups.map((g) => [
          g.studentId,
          {
            expected: g._sum.finalAmount ?? new Prisma.Decimal(0),
            collected: g._sum.amountPaid ?? new Prisma.Decimal(0),
            outstanding: g._sum.balanceDue ?? new Prisma.Decimal(0),
          },
        ])
      );

      const studentsByClassArm = new Map<string, typeof activeStudents>();
      for (const s of activeStudents) {
        if (s.classArmId) {
          const list = studentsByClassArm.get(s.classArmId) ?? [];
          list.push(s);
          studentsByClassArm.set(s.classArmId, list);
        }
      }

      const data = classArms.map((arm) => {
        const armStudents = studentsByClassArm.get(arm.id) ?? [];
        let expected = new Prisma.Decimal(0);
        let collected = new Prisma.Decimal(0);
        let outstanding = new Prisma.Decimal(0);

        for (const s of armStudents) {
          const aggs = studentAggMap.get(s.id);
          if (aggs) {
            expected = expected.plus(aggs.expected);
            collected = collected.plus(aggs.collected);
            outstanding = outstanding.plus(aggs.outstanding);
          }
        }

        return {
          classArmId: arm.id,
          className: `${arm.classLevel.name} — ${arm.name}`,
          studentCount: armStudents.length,
          expected: expected.toString(),
          collected: collected.toString(),
          outstanding: outstanding.toString(),
        };
      });

      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Invalid report type", code: "BAD_REQUEST" }, { status: 400 });
  } catch (err) {
    logError("reports", err);
    return NextResponse.json({ error: "An unexpected error occurred", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
