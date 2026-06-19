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

    // Get receipt records
    const receipts = await prisma.receipt.findMany({
      where: {
        schoolId,
        payment: {
          studentId: { in: wardIds },
          status: "recorded",
        },
      },
      include: {
        payment: {
          include: {
            student: {
              select: { firstName: true, lastName: true },
            },
            invoice: {
              select: {
                term: {
                  select: {
                    name: true,
                    session: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: receipts.map((r) => ({
        id: r.id,
        receiptNumber: r.receiptNumber,
        createdAt: r.createdAt.toISOString(),
        payment: {
          amount: r.payment.amount.toString(),
          method: r.payment.method,
          reference: r.payment.reference,
          paymentDate: r.payment.createdAt.toISOString(),
        },
        studentName: `${r.payment.student.firstName} ${r.payment.student.lastName}`,
        termName: r.payment.invoice.term.name,
        sessionName: r.payment.invoice.term.session.name,
      })),
    });
  } catch (err: any) {
    console.error("[portal/receipts] GET error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
