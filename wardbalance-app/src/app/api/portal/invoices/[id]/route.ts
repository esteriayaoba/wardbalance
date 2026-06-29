import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const resolvedParams = await params;
    const invoiceId = resolvedParams.id;

    // Fetch invoice with student, term, session and line items
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, schoolId },
      include: {
        lineItems: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            classLevel: { select: { name: true } },
            classArm: { select: { name: true } },
            parents: {
              where: { parentId },
              select: { id: true },
            },
          },
        },
        term: {
          select: {
            name: true,
            session: { select: { name: true } },
          },
        },
        payments: {
          where: { status: "recorded" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            amount: true,
            method: true,
            createdAt: true,
            reference: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Authorization: Verify parent owns this ward
    if (invoice.student.parents.length === 0) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view this invoice.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Get school name & bank settings for payments
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        address: true,
        phone: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
      },
    });

    const bankDetails = school?.bankName && school?.bankAccountNumber && school?.bankAccountName
      ? {
          bankName: school.bankName,
          accountNumber: school.bankAccountNumber,
          accountName: school.bankAccountName,
        }
      : null;

    return NextResponse.json({
      data: {
        id: invoice.id,
        status: invoice.status,
        dueDate: invoice.dueDate.toISOString(),
        totalAmount: invoice.totalAmount.toString(),
        discountAmount: invoice.discountAmount.toString(),
        finalAmount: invoice.finalAmount.toString(),
        amountPaid: invoice.amountPaid.toString(),
        balanceDue: invoice.balanceDue.toString(),
        student: {
          id: invoice.student.id,
          fullName: `${invoice.student.firstName} ${invoice.student.lastName}`,
          admissionNumber: invoice.student.admissionNumber,
          className: `${invoice.student.classLevel.name} — ${invoice.student.classArm.name}`,
        },
        termName: invoice.term.name,
        sessionName: invoice.term.session.name,
        lineItems: invoice.lineItems.map((item) => ({
          id: item.id,
          name: item.name,
          amount: item.amount.toString(),
          lineType: item.lineType,
        })),
        payments: invoice.payments.map((p) => ({
          id: p.id,
          amount: p.amount.toString(),
          method: p.method,
          createdAt: p.createdAt.toISOString(),
          reference: p.reference,
        })),
        school: {
          name: school?.name ?? session.schoolName,
          address: school?.address,
          phone: school?.phone,
          bankDetails,
        },
      },
    });
  } catch (err: any) {
    console.error("[portal/invoices/detail] GET error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
