import { prisma } from "@/lib/prisma";
import { Prisma, PaymentMethod } from "@/generated/prisma/client";
import { getPresignedGetUrl } from "@/lib/r2";
import {
  ManualPaymentSubmissionStatus,
} from "@/generated/prisma/client";

function generateReceiptNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REC-${dateStr}-${rand}`;
}

export async function fetchVerificationQueue(schoolId: string, status: string) {
  const submissions = await prisma.manualPaymentSubmission.findMany({
    where: { schoolId, status: status as ManualPaymentSubmissionStatus },
    include: {
      student: {
        select: {
          id: true, firstName: true, lastName: true, admissionNumber: true,
          classLevel: { select: { name: true } },
          classArm: { select: { name: true } },
        },
      },
      parent: {
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      },
      invoice: {
        select: {
          id: true, status: true, dueDate: true, finalAmount: true, amountPaid: true, balanceDue: true,
          term: { select: { name: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const enhanced = await Promise.all(
    submissions.map(async (sub) => {
      const proofUrl = sub.proofFileKey ? await getPresignedGetUrl(sub.proofFileKey) : null;
      return {
        ...sub,
        amount: sub.amount.toString(),
        proofUrl,
        invoice: {
          ...sub.invoice,
          finalAmount: sub.invoice.finalAmount.toString(),
          amountPaid: sub.invoice.amountPaid.toString(),
          balanceDue: sub.invoice.balanceDue.toString(),
        },
      };
    })
  );

  return enhanced;
}

export interface ApprovePaymentOptions {
  schoolId: string;
  actorId: string;
  actorName: string;
  submissionId: string;
}

export interface RejectPaymentOptions {
  schoolId: string;
  actorId: string;
  actorName: string;
  submissionId: string;
  reason: string;
}

export async function approvePaymentSubmission(options: ApprovePaymentOptions) {
  const { schoolId, actorId, actorName, submissionId } = options;

  return await prisma.$transaction(async (tx) => {
    const submission = await tx.manualPaymentSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) throw new Error("Payment submission not found.");
    if (submission.status !== "Pending") {
      throw new Error(`Submission already reviewed. Status: ${submission.status}`);
    }

    const invoice = await tx.invoice.findUnique({
      where: { id: submission.invoiceId },
    });

    if (!invoice) throw new Error("Associated invoice not found.");
    if (invoice.status === "paid") throw new Error("Invoice already fully paid.");
    if (submission.amount.greaterThan(invoice.balanceDue)) {
      throw new Error(
        `Amount exceeds outstanding balance due (₦${Number(invoice.balanceDue).toLocaleString("en-NG", { minimumFractionDigits: 0 })}).`
      );
    }

    const updatedSubmission = await tx.manualPaymentSubmission.update({
      where: { id: submissionId },
      data: { status: "Approved", reviewedById: actorId, reviewedAt: new Date() },
    });

    const payment = await tx.payment.create({
      data: {
        schoolId,
        invoiceId: submission.invoiceId,
        studentId: submission.studentId,
        parentId: submission.parentId,
        amount: submission.amount,
        method: submission.paymentMethod as PaymentMethod,
        reference: submission.reference,
        recordedById: actorId,
      },
    });

    const receiptNumber = generateReceiptNumber();
    const receipt = await tx.receipt.create({
      data: { schoolId, paymentId: payment.id, receiptNumber },
    });

    const newAmountPaid = invoice.amountPaid.plus(submission.amount);
    const newBalanceDue = invoice.balanceDue.minus(submission.amount);

    let newStatus: "draft" | "issued" | "partial" | "paid" | "overdue" = invoice.status;
    if (newBalanceDue.equals(0)) newStatus = "paid";
    else if (newAmountPaid.greaterThan(0)) newStatus = "partial";

    const updatedInvoice = await tx.invoice.update({
      where: { id: submission.invoiceId },
      data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, status: newStatus },
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        actorId,
        actorName,
        action: "MANUAL_PAYMENT_APPROVED",
        entityType: "ManualPaymentSubmission",
        entityId: submission.id,
        newValue: JSON.parse(
          JSON.stringify({
            submission: updatedSubmission, payment, receipt,
            invoiceState: {
              previousAmountPaid: invoice.amountPaid,
              previousBalanceDue: invoice.balanceDue,
              newAmountPaid, newBalanceDue, newStatus,
            },
          })
        ),
      },
    });

    return { submission: updatedSubmission, payment, receipt, invoice: updatedInvoice };
  });
}

export async function rejectPaymentSubmission(options: RejectPaymentOptions) {
  const { schoolId, actorId, actorName, submissionId, reason } = options;

  return await prisma.$transaction(async (tx) => {
    const sub = await tx.manualPaymentSubmission.update({
      where: { id: submissionId },
      data: { status: "Rejected", rejectionReason: reason, reviewedById: actorId, reviewedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        schoolId, actorId, actorName,
        action: "MANUAL_PAYMENT_REJECTED",
        entityType: "ManualPaymentSubmission",
        entityId: submissionId,
        newValue: { status: "Rejected", rejectionReason: reason },
      },
    });

    return sub;
  });
}

export async function requestReuploadSubmission(options: RejectPaymentOptions) {
  const { schoolId, actorId, actorName, submissionId, reason } = options;

  return await prisma.$transaction(async (tx) => {
    const sub = await tx.manualPaymentSubmission.update({
      where: { id: submissionId },
      data: { status: "ReuploadRequested", reuploadReason: reason, reviewedById: actorId, reviewedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        schoolId, actorId, actorName,
        action: "MANUAL_PAYMENT_REUPLOAD_REQUESTED",
        entityType: "ManualPaymentSubmission",
        entityId: submissionId,
        newValue: { status: "ReuploadRequested", reuploadReason: reason },
      },
    });

    return sub;
  });
}

export async function recordManualPayment(options: {
  schoolId: string;
  actorId: string;
  actorName: string;
  invoiceId: string;
  amount: Prisma.Decimal;
  method: string;
  reference?: string;
}) {
  const { schoolId, actorId, actorName, invoiceId, amount, method, reference } = options;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, schoolId },
    include: {
      term: true,
      student: {
        include: {
          parents: { where: { isPrimaryContact: true }, take: 1 },
        },
      },
    },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.term.status === "locked") throw new Error("Term is locked.");
  if (amount.lessThanOrEqualTo(0)) throw new Error("Amount must be positive.");
  if (amount.greaterThan(invoice.balanceDue)) {
    throw new Error(`Amount exceeds balance due.`);
  }

  const primaryParent = invoice.student.parents[0]?.parentId;
  let fallbackParentId: string | null = primaryParent || null;
  if (!fallbackParentId) {
    const anyParent = await prisma.parentWardLink.findFirst({
      where: { studentId: invoice.studentId },
    });
    fallbackParentId = anyParent?.parentId || null;
  }

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        schoolId, invoiceId, studentId: invoice.studentId,
        parentId: fallbackParentId, amount, method: method as PaymentMethod,
        reference: reference || null, recordedById: actorId,
      },
    });

    const receiptNumber = generateReceiptNumber();
    const receipt = await tx.receipt.create({
      data: { schoolId, paymentId: payment.id, receiptNumber },
    });

    const newAmountPaid = invoice.amountPaid.plus(amount);
    const newBalanceDue = invoice.balanceDue.minus(amount);

    let newStatus: "draft" | "issued" | "partial" | "paid" | "overdue" = invoice.status;
    if (newBalanceDue.equals(0)) newStatus = "paid";
    else if (newAmountPaid.greaterThan(0)) newStatus = "partial";

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue, status: newStatus },
    });

    await tx.auditLog.create({
      data: {
        schoolId, actorId, actorName,
        action: "PAYMENT_RECORDED",
        entityType: "Payment",
        entityId: payment.id,
        newValue: JSON.parse(JSON.stringify({
          payment, receipt,
          invoiceState: {
            previousAmountPaid: invoice.amountPaid,
            previousBalanceDue: invoice.balanceDue,
            newAmountPaid, newBalanceDue, newStatus,
          },
        })),
      },
    });

    return { payment, receipt, invoice: updatedInvoice };
  });
}
