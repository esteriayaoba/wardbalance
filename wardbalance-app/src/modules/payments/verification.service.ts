import { prisma } from "@/lib/prisma";
import { Prisma, PaymentMethod, ManualPaymentSubmissionStatus } from "@/generated/prisma/client";
import { getPresignedGetUrl } from "@/lib/r2";
import { recordPayment } from "@/modules/payments/recorder.service";
import { resolveParentId } from "@/modules/payments/resolve-parent";

export async function fetchVerificationQueue(schoolId: string, status: string) {
  const submissions = await prisma.manualPaymentSubmission.findMany({
    where: { schoolId, status: status as ManualPaymentSubmissionStatus },
    include: {
      student: {
        select: {
          id: true, firstName: true, lastName: true, admissionNumber: true,
          classLevel: { select: { name: true } }, classArm: { select: { name: true } },
        },
      },
      parent: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
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
    const submission = await tx.manualPaymentSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new Error("Payment submission not found.");
    if (submission.status !== "Pending") {
      throw new Error(`Submission already reviewed. Status: ${submission.status}`);
    }

    const invoice = await tx.invoice.findUnique({
      where: { id: submission.invoiceId },
      include: { term: { select: { status: true } } },
    });
    if (!invoice) throw new Error("Associated invoice not found.");
    if (invoice.status === "paid") throw new Error("Invoice already fully paid.");
    if (invoice.term.status === "locked") throw new Error("Cannot approve payment for a locked term.");
    if (submission.amount.greaterThan(invoice.balanceDue)) {
      throw new Error(`Amount exceeds outstanding balance due (₦${Number(invoice.balanceDue).toLocaleString("en-NG", { minimumFractionDigits: 0 })}).`);
    }

    const updatedSubmission = await tx.manualPaymentSubmission.update({
      where: { id: submissionId },
      data: { status: "Approved", reviewedById: actorId, reviewedAt: new Date() },
    });

    const result = await recordPayment({
      schoolId, invoiceId: submission.invoiceId, studentId: submission.studentId,
      parentId: submission.parentId, amount: submission.amount,
      method: submission.paymentMethod, reference: submission.reference,
      recordedById: actorId, actorId, actorName,
      action: "MANUAL_PAYMENT_APPROVED", receiptPrefix: "REC", tx,
    });

    return { submission: updatedSubmission, ...result };
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
      data: { schoolId, actorId, actorName, action: "MANUAL_PAYMENT_REJECTED", entityType: "ManualPaymentSubmission", entityId: submissionId, newValue: { status: "Rejected", rejectionReason: reason } },
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
      data: { schoolId, actorId, actorName, action: "MANUAL_PAYMENT_REUPLOAD_REQUESTED", entityType: "ManualPaymentSubmission", entityId: submissionId, newValue: { status: "ReuploadRequested", reuploadReason: reason } },
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

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, schoolId },
      include: { term: { select: { status: true } } },
    });

    if (!invoice) throw new Error("Invoice not found");
    if (invoice.term.status === "locked") throw new Error("Term is locked.");

    const parentId = await resolveParentId(schoolId, invoice.studentId);

    return recordPayment({
      schoolId, invoiceId, studentId: invoice.studentId, parentId, amount,
      method: method as PaymentMethod, reference: reference || null,
      recordedById: actorId, actorId, actorName,
      action: "PAYMENT_RECORDED", receiptPrefix: "REC",
      tx,
    });
  });
}
