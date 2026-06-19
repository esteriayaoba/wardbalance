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
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "revenue_summary";
    const termId = searchParams.get("termId") || undefined;
    const classLevelId = searchParams.get("classLevelId") || undefined;

    // Report Type 1: Revenue Summary
    if (reportType === "revenue_summary") {
      const terms = await prisma.academicTerm.findMany({
        where: { schoolId },
        include: {
          session: true,
          invoices: {
            select: {
              finalAmount: true,
              amountPaid: true,
              balanceDue: true,
            },
          },
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

    // Report Type 2: Outstanding Balance / Debtors List
    if (reportType === "debtors") {
      const whereClause: any = {
        schoolId,
        balanceDue: { gt: 0 },
      };

      if (termId) whereClause.termId = termId;
      if (classLevelId) {
        whereClause.student = {
          classLevelId,
        };
      }

      const invoices = await prisma.invoice.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              admissionNumber: true,
              classLevel: { select: { name: true } },
              classArm: { select: { name: true } },
            },
          },
          term: {
            select: {
              name: true,
              session: { select: { name: true } },
            },
          },
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

    // Report Type 3: Class Collection Summary
    if (reportType === "class_summary") {
      // Get all class arms in the school
      const classArms = await prisma.classArm.findMany({
        where: { schoolId },
        include: {
          classLevel: true,
          students: {
            where: { status: "active" },
            include: {
              invoices: termId ? { where: { termId } } : true,
            },
          },
        },
        orderBy: { classLevel: { name: "asc" } },
      });

      const data = classArms.map((arm) => {
        let studentCount = arm.students.length;
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
          studentCount,
          expected: expected.toString(),
          collected: collected.toString(),
          outstanding: outstanding.toString(),
        };
      });

      return NextResponse.json({ data });
    }

    return NextResponse.json(
      { error: "Invalid report type requested", code: "BAD_REQUEST" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[reports] GET error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
