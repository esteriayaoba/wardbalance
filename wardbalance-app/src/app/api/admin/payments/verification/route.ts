import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma, PaymentMethod } from "@/generated/prisma/client";
import { requireVerifiedAdminUser } from "@/lib/auth/require-verified-admin";
import { getPresignedGetUrl } from "@/lib/r2";

// Generate unique receipt numbers
function generateReceiptNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REC-${dateStr}-${rand}`;
}

const VerificationActionSchema = z.object({
  submissionId: z.string().min(1, "Submission ID is required"),
  action: z.enum(["approve", "reject", "request_reupload"]),
  reason: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const guard = await requireVerifiedAdminUser();
    if (!guard.authorized) {
      return guard.response;
    }
    const session = guard.session;
    const schoolId = session.schoolId;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") || "Pending";

    // Query pending payment submissions
    const submissions = await prisma.manualPaymentSubmission.findMany({
      where: {
        schoolId,
        status: statusParam as any,
      },
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
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        invoice: {
          select: {
            id: true,
            status: true,
            dueDate: true,
            finalAmount: true,
            amountPaid: true,
            balanceDue: true,
            term: { select: { name: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Generate short-lived view URLs for proofs
    const enhancedSubmissions = await Promise.all(
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

    return NextResponse.json({ data: enhancedSubmissions });
  } catch (err: any) {
    console.error("[verification] GET error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireVerifiedAdminUser();
    if (!guard.authorized) {
      return guard.response;
    }
    const session = guard.session;
    const schoolId = session.schoolId;

    const body = await request.json();
    const parsed = VerificationActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid verification payload", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { submissionId, action, reason } = parsed.data;

    // Fetch and check manual payment submission record
    const submission = await prisma.manualPaymentSubmission.findFirst({
      where: { id: submissionId, schoolId },
      include: {
        invoice: {
          select: {
            id: true,
            status: true,
            amountPaid: true,
            balanceDue: true,
            finalAmount: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Payment submission not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (submission.status !== "Pending") {
      return NextResponse.json(
        { error: `This submission has already been reviewed. Current status is ${submission.status}.`, code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      try {
        const result = await prisma.$transaction(async (tx) => {
          // Re-fetch invoice details inside transaction for concurrency safety
          const invoice = await tx.invoice.findUnique({
            where: { id: submission.invoiceId },
          });

          if (!invoice) {
            throw new Error("Associated invoice not found.");
          }

          if (invoice.status === "paid") {
            throw new Error("The associated invoice has already been fully paid.");
          }

          if (submission.amount.greaterThan(invoice.balanceDue)) {
            throw new Error(`The submitted proof amount exceeds the current outstanding balance due (₦${Number(invoice.balanceDue).toLocaleString("en-NG", { minimumFractionDigits: 0 })}).`);
          }

          // 1. Update manual submission status
          const updatedSubmission = await tx.manualPaymentSubmission.update({
            where: { id: submissionId },
            data: {
              status: "Approved",
              reviewedById: session.userId,
              reviewedAt: new Date(),
            },
          });

          // 2. Create actual payment ledger entry
          const payment = await tx.payment.create({
            data: {
              schoolId,
              invoiceId: submission.invoiceId,
              studentId: submission.studentId,
              parentId: submission.parentId,
              amount: submission.amount,
              method: submission.paymentMethod as PaymentMethod,
              reference: submission.reference,
              recordedById: session.userId,
            },
          });

          // 3. Create receipt once
          const receiptNumber = generateReceiptNumber();
          const receipt = await tx.receipt.create({
            data: {
              schoolId,
              paymentId: payment.id,
              receiptNumber,
            },
          });

          // 4. Update invoice balances
          const newAmountPaid = invoice.amountPaid.plus(submission.amount);
          const newBalanceDue = invoice.balanceDue.minus(submission.amount);

          let newStatus: any = invoice.status;
          if (newBalanceDue.equals(0)) {
            newStatus = "paid";
          } else if (newAmountPaid.greaterThan(0)) {
            newStatus = "partial";
          }

          const updatedInvoice = await tx.invoice.update({
            where: { id: submission.invoiceId },
            data: {
              amountPaid: newAmountPaid,
              balanceDue: newBalanceDue,
              status: newStatus,
            },
          });

          // 5. Create Audit Log
          await tx.auditLog.create({
            data: {
              schoolId,
              actorId: session.userId,
              actorName: session.fullName,
              action: "MANUAL_PAYMENT_APPROVED",
              entityType: "ManualPaymentSubmission",
              entityId: submission.id,
              newValue: JSON.parse(
                JSON.stringify({
                  submission: updatedSubmission,
                  payment,
                  receipt,
                  invoiceState: {
                    previousAmountPaid: invoice.amountPaid,
                    previousBalanceDue: invoice.balanceDue,
                    newAmountPaid,
                    newBalanceDue,
                    newStatus,
                  },
                })
              ),
            },
          });

          return { submission: updatedSubmission, payment, receipt, invoice: updatedInvoice };
        });

        return NextResponse.json({
          data: result,
          message: "Payment successfully approved and recorded in invoice ledger.",
        });
      } catch (transError: any) {
        return NextResponse.json(
          { error: transError.message ?? "Failed to approve payment transaction.", code: "TRANSACTION_ERROR" },
          { status: 400 }
        );
      }
    } else if (action === "reject") {
      if (!reason || reason.trim() === "") {
        return NextResponse.json(
          { error: "A rejection reason is required.", code: "VALIDATION_ERROR" },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const sub = await tx.manualPaymentSubmission.update({
          where: { id: submissionId },
          data: {
            status: "Rejected",
            rejectionReason: reason.trim(),
            reviewedById: session.userId,
            reviewedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            schoolId,
            actorId: session.userId,
            actorName: session.fullName,
            action: "MANUAL_PAYMENT_REJECTED",
            entityType: "ManualPaymentSubmission",
            entityId: submission.id,
            newValue: {
              status: "Rejected",
              rejectionReason: reason.trim(),
            },
          },
        });

        return sub;
      });

      return NextResponse.json({
        data: updated,
        message: "Payment submission rejected.",
      });
    } else if (action === "request_reupload") {
      if (!reason || reason.trim() === "") {
        return NextResponse.json(
          { error: "A reason explaining the re-upload request is required.", code: "VALIDATION_ERROR" },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const sub = await tx.manualPaymentSubmission.update({
          where: { id: submissionId },
          data: {
            status: "ReuploadRequested",
            reuploadReason: reason.trim(),
            reviewedById: session.userId,
            reviewedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            schoolId,
            actorId: session.userId,
            actorName: session.fullName,
            action: "MANUAL_PAYMENT_REUPLOAD_REQUESTED",
            entityType: "ManualPaymentSubmission",
            entityId: submission.id,
            newValue: {
              status: "ReuploadRequested",
              reuploadReason: reason.trim(),
            },
          },
        });

        return sub;
      });

      return NextResponse.json({
        data: updated,
        message: "Parent has been requested to re-upload payment proof.",
      });
    }
  } catch (err: any) {
    console.error("[verification] POST error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
