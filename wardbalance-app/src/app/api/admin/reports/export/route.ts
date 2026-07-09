import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { createObjectCsvStringifier } from "csv-writer";
import { logError } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const schoolId = guard.session.schoolId;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const termId = searchParams.get("termId");
    const classLevelId = searchParams.get("classLevelId");

    if (!type || !["debtors", "revenue", "collection"].includes(type)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    let csvString = "";

    if (type === "debtors") {
      const where: Record<string, unknown> = {
        schoolId,
        balanceDue: { gt: 0 },
        status: { in: ["issued", "partial", "overdue"] },
      };
      if (termId) where.termId = termId;
      if (classLevelId) where.student = { classLevelId };

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          student: { include: { classLevel: { select: { name: true } }, classArm: { select: { name: true } } } },
          term: { include: { session: { select: { name: true } } } },
        },
        orderBy: { balanceDue: "desc" },
      });

      const csvWriter = createObjectCsvStringifier({
        header: [
          { id: "studentName", title: "Student Name" },
          { id: "admissionNumber", title: "Admission Number" },
          { id: "class", title: "Class" },
          { id: "term", title: "Academic Term" },
          { id: "finalAmount", title: "Invoice Total (NGN)" },
          { id: "amountPaid", title: "Amount Paid (NGN)" },
          { id: "balanceDue", title: "Balance Due (NGN)" },
          { id: "status", title: "Status" },
          { id: "dueDate", title: "Due Date" },
        ],
      });

      const records = invoices.map((inv) => ({
        studentName: `${inv.student.lastName}, ${inv.student.firstName}`,
        admissionNumber: inv.student.admissionNumber,
        class: `${inv.student.classLevel.name} - ${inv.student.classArm.name}`,
        term: `${inv.term.session.name} - ${inv.term.name}`,
        finalAmount: Number(inv.finalAmount.toString()),
        amountPaid: Number(inv.amountPaid.toString()),
        balanceDue: Number(inv.balanceDue.toString()),
        status: inv.status.toUpperCase(),
        dueDate: inv.dueDate.toISOString().split("T")[0],
      }));

      csvString = csvWriter.getHeaderString() + csvWriter.stringifyRecords(records);

      return new NextResponse(csvString, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="debtors-report-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (type === "revenue") {
      const where: Record<string, unknown> = { schoolId };
      if (termId) where.termId = termId;

      const invoices = await prisma.invoice.findMany({
        where,
        include: { term: { include: { session: { select: { name: true } } } } },
      });

      const summaryByTerm: Record<string, {
        termName: string; expected: Prisma.Decimal; collected: Prisma.Decimal; outstanding: Prisma.Decimal;
      }> = {};

      for (const inv of invoices) {
        const key = inv.termId;
        if (!summaryByTerm[key]) {
          summaryByTerm[key] = {
            termName: `${inv.term.session.name} - ${inv.term.name}`,
            expected: new Prisma.Decimal(0),
            collected: new Prisma.Decimal(0),
            outstanding: new Prisma.Decimal(0),
          };
        }
        summaryByTerm[key].expected = summaryByTerm[key].expected.plus(inv.finalAmount);
        summaryByTerm[key].collected = summaryByTerm[key].collected.plus(inv.amountPaid);
        summaryByTerm[key].outstanding = summaryByTerm[key].outstanding.plus(inv.balanceDue);
      }

      const csvWriter = createObjectCsvStringifier({
        header: [
          { id: "termName", title: "Academic Term" },
          { id: "expected", title: "Expected Revenue (NGN)" },
          { id: "collected", title: "Collected Revenue (NGN)" },
          { id: "outstanding", title: "Outstanding Balance (NGN)" },
          { id: "collectionRate", title: "Collection Rate (%)" },
        ],
      });

      const records = Object.values(summaryByTerm).map((term) => {
        const expected = term.expected;
        const collected = term.collected;
        const outstanding = term.outstanding;
        return {
          termName: term.termName,
          expected: Number(expected.toString()),
          collected: Number(collected.toString()),
          outstanding: Number(outstanding.toString()),
          collectionRate: expected.greaterThan(0)
            ? collected.div(expected).mul(100).toFixed(2)
            : "0.00",
        };
      });

      csvString = csvWriter.getHeaderString() + csvWriter.stringifyRecords(records);

      return new NextResponse(csvString, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="revenue-report-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (type === "collection") {
      const termWhere: Record<string, unknown> = { schoolId };
      if (termId) termWhere.termId = termId;

      const classArms = await prisma.classArm.findMany({
        where: { schoolId },
        include: {
          classLevel: { select: { name: true } },
          students: {
            where: { status: "active" },
            include: {
              invoices: termId ? { where: { termId } } : { select: { finalAmount: true, amountPaid: true, balanceDue: true } },
            },
          },
        },
        orderBy: { classLevel: { name: "asc" } },
      });

      const csvWriter = createObjectCsvStringifier({
        header: [
          { id: "className", title: "Class Section" },
          { id: "studentCount", title: "Active Students" },
          { id: "expected", title: "Expected Revenue (NGN)" },
          { id: "collected", title: "Collected Revenue (NGN)" },
          { id: "outstanding", title: "Outstanding Balance (NGN)" },
          { id: "collectionRate", title: "Collection Rate (%)" },
        ],
      });

      const records = classArms.map((arm) => {
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
          className: `${arm.classLevel.name} - ${arm.name}`,
          studentCount: arm.students.length,
          expected: Number(expected.toString()),
          collected: Number(collected.toString()),
          outstanding: Number(outstanding.toString()),
          collectionRate: expected.greaterThan(0)
            ? collected.div(expected).mul(100).toFixed(2)
            : "0.00",
        };
      });

      csvString = csvWriter.getHeaderString() + csvWriter.stringifyRecords(records);

      return new NextResponse(csvString, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="class-collections-report-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (err) {
    logError("export-report", err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
