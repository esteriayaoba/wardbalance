import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireVerifiedAdminUser } from "@/lib/auth/require-verified-admin";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { enqueueNotification } from "@/lib/notifications";
import {
  fetchVerificationQueue,
  approvePaymentSubmission,
  rejectPaymentSubmission,
  requestReuploadSubmission,
} from "@/modules/payments/verification.service";

const VerificationActionSchema = z.object({
  submissionId: z.string().min(1, "Submission ID is required"),
  action: z.enum(["approve", "reject", "request_reupload"]),
  reason: z.string().optional(),
});

const BulkApproveSchema = z.object({
  submissionIds: z.array(z.string().min(1)).min(1, "At least one submission ID is required"),
});

export async function GET(request: NextRequest) {
  try {
    const guard = await requireVerifiedAdminUser();
    if (!guard.authorized) return guard.response;
    const session = guard.session;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") || "Pending";

    const data = await fetchVerificationQueue(session.schoolId, statusParam);
    return NextResponse.json({ data });
  } catch (err) {
    logError("verification", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireVerifiedAdminUser();
    if (!guard.authorized) return guard.response;
    const session = guard.session;

    const body = await request.json();

    // Check if this is a bulk action
    if (body.bulkAction) {
      const parsed = BulkApproveSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid payload", code: "VALIDATION_ERROR" },
          { status: 400 }
        );
      }

      const { submissionIds } = parsed.data;
      const results: Array<{ submissionId: string; status: "success" | "error"; message?: string }> = [];

      for (const submissionId of submissionIds) {
        try {
          const result = await approvePaymentSubmission({
            schoolId: session.schoolId,
            actorId: session.userId,
            actorName: session.fullName,
            submissionId,
          });

          notifyParent(session.schoolId, result.submission.parentId,
            "Payment Approved — WardBalance",
            `Your payment of ₦${Number(result.payment.amount).toLocaleString()} has been approved. Receipt: ${result.receipt.receiptNumber}`
          ).catch(() => {});

          results.push({ submissionId, status: "success" });
        } catch (err) {
          results.push({ submissionId, status: "error", message: err instanceof Error ? err.message : "Unknown error" });
        }
      }

      const successCount = results.filter((r) => r.status === "success").length;
      return NextResponse.json({
        data: { results },
        message: `${successCount} of ${submissionIds.length} payments approved successfully.`,
      });
    }

    const parsed = VerificationActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { submissionId, action, reason } = parsed.data;

    switch (action) {
      case "approve": {
        const result = await approvePaymentSubmission({
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          submissionId,
        });

        notifyParent(session.schoolId, result.submission.parentId,
          "Payment Approved — WardBalance",
          `Your payment of ₦${Number(result.payment.amount).toLocaleString()} has been approved. Receipt: ${result.receipt.receiptNumber}`
        ).catch(() => {});

        return NextResponse.json({
          data: result,
          message: "Payment approved and recorded in invoice ledger.",
        });
      }

      case "reject": {
        if (!reason?.trim()) {
          return NextResponse.json(
            { error: "A rejection reason is required.", code: "VALIDATION_ERROR" },
            { status: 400 }
          );
        }
        const result = await rejectPaymentSubmission({
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          submissionId,
          reason: reason.trim(),
        });

        notifyParent(session.schoolId, result.parentId, "Payment Rejected", `Your payment submission was rejected. Reason: ${reason.trim()}`).catch(() => {});

        return NextResponse.json({ data: result, message: "Payment submission rejected." });
      }

      case "request_reupload": {
        if (!reason?.trim()) {
          return NextResponse.json(
            { error: "A re-upload reason is required.", code: "VALIDATION_ERROR" },
            { status: 400 }
          );
        }
        const result = await requestReuploadSubmission({
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          submissionId,
          reason: reason.trim(),
        });

        notifyParent(session.schoolId, result.parentId, "Re-upload Requested", `Please re-upload your payment proof. Reason: ${reason.trim()}`).catch(() => {});

        return NextResponse.json({
          data: result,
          message: "Parent requested to re-upload payment proof.",
        });
      }
    }
  } catch (err) {
    logError("verification POST", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

async function notifyParent(schoolId: string, parentId: string, subject: string, content: string) {
  try {
    const parent = await prisma.parent.findUnique({ where: { id: parentId } });
    if (parent) {
      await enqueueNotification({ schoolId, parentId, channel: "email", recipient: parent.email || parent.phone, subject, content });
    }
  } catch {
    // Non-blocking
  }
}
