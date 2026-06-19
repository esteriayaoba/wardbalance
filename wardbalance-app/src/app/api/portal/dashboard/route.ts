import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

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

    // 1. Fetch parent's wards
    const wardLinks = await prisma.parentWardLink.findMany({
      where: { parentId, schoolId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            classLevel: { select: { name: true } },
            classArm: { select: { name: true } },
          },
        },
      },
    });

    const wards = wardLinks.map((link) => link.student);

    // 2. Fetch all invoices for these wards
    const wardIds = wards.map((w) => w.id);
    const invoices = await prisma.invoice.findMany({
      where: {
        schoolId,
        studentId: { in: wardIds },
        status: { in: ["issued", "partial", "overdue"] },
      },
      select: {
        id: true,
        studentId: true,
        balanceDue: true,
        finalAmount: true,
        amountPaid: true,
      },
    });

    // 3. Compute total outstanding and per-ward balances
    let totalOutstanding = new Prisma.Decimal(0);
    const wardBalances = wards.map((ward) => {
      const wardInvoices = invoices.filter((inv) => inv.studentId === ward.id);
      const outstanding = wardInvoices.reduce(
        (sum, inv) => sum.plus(inv.balanceDue),
        new Prisma.Decimal(0)
      );
      
      totalOutstanding = totalOutstanding.plus(outstanding);

      return {
        id: ward.id,
        firstName: ward.firstName,
        lastName: ward.lastName,
        admissionNumber: ward.admissionNumber,
        className: `${ward.classLevel.name} — ${ward.classArm.name}`,
        outstanding: outstanding.toString(),
        invoiceCount: wardInvoices.length,
      };
    });

    // 4. Fetch recent payments
    const payments = await prisma.payment.findMany({
      where: {
        schoolId,
        studentId: { in: wardIds },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        amount: true,
        method: true,
        status: true,
        createdAt: true,
        student: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({
      data: {
        totalOutstanding: totalOutstanding.toString(),
        wards: wardBalances,
        recentPayments: payments.map((p) => ({
          id: p.id,
          amount: p.amount.toString(),
          method: p.method,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
          studentName: `${p.student.firstName} ${p.student.lastName}`,
        })),
      },
    });
  } catch (err: any) {
    console.error("[portal/dashboard] GET error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
