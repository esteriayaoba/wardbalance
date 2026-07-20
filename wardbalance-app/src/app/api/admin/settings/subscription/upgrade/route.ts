import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { z } from "zod";

const UpgradeSchema = z.object({
  planId: z.enum(["starter_free", "pro_term", "group_custom"]),
});

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = UpgradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const schoolId = guard.session.schoolId;
    const { planId } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.schoolSubscription.findUnique({ where: { schoolId } });
      if (!subscription) {
        throw new Error("No subscription found");
      }

      const newPlan = await tx.pricingPlan.findUnique({ where: { id: planId } });
      if (!newPlan || !newPlan.isActive) {
        throw new Error("Invalid or inactive plan");
      }

      const previousPlanId = subscription.planId;
      const previousStatus = subscription.status;

      const updated = await tx.schoolSubscription.update({
        where: { schoolId },
        data: {
          planId,
          status: newPlan.tier === 0 ? "active" : "active",
          autoRenew: newPlan.tier > 0,
          currentPeriodStart: new Date(),
          currentPeriodEnd: newPlan.billingPeriod
            ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            : null,
          trialEndsAt: null,
        },
      });

      await tx.school.update({
        where: { id: schoolId },
        data: {
          selectedPlan: planId === "starter_free" ? "freemium" : planId === "pro_term" ? "business" : "multi_school",
          planStatus: "active",
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName ?? guard.session.email,
          action: "plan_upgraded",
          entityType: "SchoolSubscription",
          entityId: subscription.id,
          previousValue: { planId: previousPlanId, status: previousStatus },
          newValue: { planId, status: "active" },
        },
      });

      return updated;
    });

    return NextResponse.json({ data: { status: result.status, planId: result.planId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upgrade failed";
    console.error("[subscription/upgrade] Failed:", err);
    return NextResponse.json({ error: message, code: "UPGRADE_FAILED" }, { status: 400 });
  }
}
