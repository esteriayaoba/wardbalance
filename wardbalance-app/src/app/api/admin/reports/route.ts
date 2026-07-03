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
          invoices: { select: { finalAmount: true, amountPaid: true, balanceDue: true } },
        },
        orderBy: { startDate: "desc" },
      });

      const data = terms.map((term) => {
        let expected = new Prisma.Decimal(0);
        let collected = new Prisma.Decimal(0);
        let outstanding = new Prisma.Decimal(0);

        term.invoices.forEach((inv) => {
          expected = expected.plus(inv.finalAmount);
          collected = collected.plus(inv.amountPaid);
          outstanding = outstanding.plus(inv.balanceDue);
        });

        return {
          termId: term.id,
          termName: term.name,
          sessionName: term.session.name,
          expected: expected.toString(),
          collected: collected.toString(),
          outstanding: outstanding.toString(),
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
          students: {
            where: { status: "active" },
            include: { invoices: termId ? { where: { termId } } : { select: { finalAmount: true, amountPaid: true, balanceDue: true } } },
          },
        },
        orderBy: { classLevel: { name: "asc" } },
      });

      const data = classArms.map((arm) => {
        let expected = new Prisma.Decimal(0);
        let collected = new Prisma.Decimal(0);
        let outstanding = new Prisma.Decimal(0);

        arm.students.forEach((student) => {
          student.invoices.forEach((inv) => {
            expected = expected.plus(inv.finalAmount);
            collected = collected.plus(inv.amountPaid);
            outstanding = outstanding.plus(inv.balanceDue);
          });
        });

        return {
          classArmId: arm.id,
          className: `${arm.classLevel.name} — ${arm.name}`,
          studentCount: arm.students.length,
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
