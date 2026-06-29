import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { logError } from "@/lib/logger";

const ProofUploadSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  reference: z.string().min(1, "Transaction reference is required"),
  proofFileKey: z.string().min(1, "Proof file key is required"),
  proofFileName: z.string().min(1, "Proof file name is required"),
  proofFileType: z.string().min(1, "Proof file type is required"),
  proofFileSize: z.number().positive("Proof file size must be positive"),
});

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

    // Get payment records
    const payments = await prisma.payment.findMany({
      where: {
        schoolId,
        studentId: { in: wardIds },
      },
      include: {
        student: {
          select: { firstName: true, lastName: true },
        },
        invoice: {
          select: {
            term: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get manual payment proof submissions
    const manualSubmissions = await prisma.manualPaymentSubmission.findMany({
      where: {
        schoolId,
        studentId: { in: wardIds },
      },
      include: {
        student: {
          select: { firstName: true, lastName: true },
        },
        invoice: {
          select: {
            term: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const formattedPayments = payments.map((p) => ({
      id: p.id,
      amount: p.amount.toString(),
      method: p.method,
      status: p.status, // "recorded" | "void"
      reference: p.reference,
      createdAt: p.createdAt.toISOString(),
      studentName: `${p.student.firstName} ${p.student.lastName}`,
      termName: p.invoice.term.name,
    }));

    const formattedManualSubmissions = manualSubmissions.map((m) => ({
      id: m.id,
      amount: m.amount.toString(),
      method: m.paymentMethod,
      status: m.status === "Pending" ? "pending" : m.status === "Approved" ? "approved" : m.status === "Rejected" ? "rejected" : m.status === "ReuploadRequested" ? "reupload requested" : "cancelled",
      reference: m.reference,
      createdAt: m.submittedAt.toISOString(),
      studentName: `${m.student.firstName} ${m.student.lastName}`,
      termName: m.invoice.term.name,
    }));

    // Merge and sort by date descending
    const allLogs = [...formattedPayments, ...formattedManualSubmissions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      data: allLogs,
    });
  } catch (err) {
    logError("portal-payments GET", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "Parent") {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const parentId = session.userId;
    const schoolId = session.schoolId;

    const body = await request.json();
    const parsed = ProofUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid proof payload", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { invoiceId, amount, reference, proofFileKey, proofFileName, proofFileType, proofFileSize } = parsed.data;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId, student: { parents: { some: { parentId } } } },
      select: { id: true, studentId: true, status: true, balanceDue: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found or unauthorized.", code: "NOT_FOUND" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ error: "This invoice is already fully paid.", code: "BAD_REQUEST" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const submission = await tx.manualPaymentSubmission.create({
        data: {
          schoolId, invoiceId, studentId: invoice.studentId, parentId,
          submittedById: parentId, amount: new Prisma.Decimal(amount),
          reference: reference.trim(), proofFileKey, proofFileName, proofFileType, proofFileSize,
          status: "Pending",
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId, actorId: parentId, actorName: session.fullName || "Parent User",
          action: "PAYMENT_PROOF_SUBMITTED", entityType: "ManualPaymentSubmission",
          entityId: submission.id, newValue: { amount, reference, proofFileKey, invoiceId },
        },
      });

      return submission;
    });

    return NextResponse.json({
      data: { success: true, status: "Pending", reference, amount: amount.toString(), message: "Proof of payment submitted successfully and is awaiting bursar verification." },
    });
  } catch (err) {
    logError("portal-payments POST", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

