import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";

export async function POST() {
  try {
    const guard = await requireRole(["SchoolOwner"]);
    if (!guard.authorized) return guard.response;

    const schoolId = guard.session.schoolId;

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.schoolSubscription.findUnique({ where: { schoolId } });
      if (!subscription) {
        throw new Error("No subscription found");
      }

      if (subscription.status !== "active" && subscription.status !== "trialing") {
        throw new Error("Only active or trialing subscriptions can be cancelled");
      }

      const updated = await tx.schoolSubscription.update({
        where: { schoolId },
        data: {
          cancelAtPeriodEnd: true,
          status: "cancelled",
          autoRenew: false,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName ?? guard.session.email,
          action: "subscription_cancelled",
          entityType: "SchoolSubscription",
          entityId: subscription.id,
          previousValue: { status: subscription.status, autoRenew: subscription.autoRenew },
          newValue: { status: "cancelled", autoRenew: false, cancelAtPeriodEnd: true },
        },
      });

      return updated;
    });

    return NextResponse.json({ data: { status: result.status } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cancellation failed";
    console.error("[subscription/cancel] Failed:", err);
    return NextResponse.json({ error: message, code: "CANCEL_FAILED" }, { status: 400 });
  }
}
