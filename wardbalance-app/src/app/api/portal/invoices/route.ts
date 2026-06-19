import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "Parent") {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const parentId = session.userId;
    const schoolId = session.schoolId;

    // Get parent's wards
    const wardLinks = await prisma.parentWardLink.findMany({
      where: { parentId, schoolId },
      select: { studentId: true },
    });

    const wardIds = wardLinks.map((link) => link.studentId);

    // Get invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        schoolId,
        studentId: { in: wardIds },
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
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
      orderBy: { dueDate: "desc" },
    });

    return NextResponse.json({
      data: invoices.map((inv) => ({
        id: inv.id,
        studentId: inv.studentId,
        studentName: `${inv.student.firstName} ${inv.student.lastName}`,
        className: `${inv.student.classLevel.name} — ${inv.student.classArm.name}`,
        termName: inv.term.name,
        sessionName: inv.term.session.name,
        status: inv.status,
        dueDate: inv.dueDate.toISOString(),
        totalAmount: inv.totalAmount.toString(),
        discountAmount: inv.discountAmount.toString(),
        finalAmount: inv.finalAmount.toString(),
        amountPaid: inv.amountPaid.toString(),
        balanceDue: inv.balanceDue.toString(),
      })),
    });
  } catch (err: any) {
    console.error("[portal/invoices] GET error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
