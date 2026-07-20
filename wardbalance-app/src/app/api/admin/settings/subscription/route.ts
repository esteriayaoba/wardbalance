import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";

export async function GET() {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const schoolId = guard.session.schoolId;

    const subscription = await prisma.schoolSubscription.findUnique({
      where: { schoolId },
      include: {
        plan: true,
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription found. Please contact support.", code: "NO_SUBSCRIPTION" },
        { status: 404 },
      );
    }

    const [studentCount, staffCount] = await Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.user.count({ where: { schoolId } }),
    ]);

    const limits = subscription.plan.limits as Record<string, unknown>;

    return NextResponse.json({
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          plan: {
            id: subscription.plan.id,
            name: subscription.plan.name,
            tier: subscription.plan.tier,
            price: Number(subscription.plan.price),
            currency: subscription.plan.currency,
            billingPeriod: subscription.plan.billingPeriod,
            features: subscription.plan.features,
            limits,
          },
          autoRenew: subscription.autoRenew,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          trialStartedAt: subscription.trialStartedAt?.toISOString() ?? null,
          trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
          currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          hasCardOnFile: !!subscription.flwCardToken,
        },
        usage: {
          students: studentCount,
          staff: staffCount,
          studentLimit: (limits.maxStudents as number) ?? -1,
          staffLimit: (limits.maxStaff as number) ?? -1,
        },
        recentInvoices: subscription.invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: Number(inv.amount),
          currency: inv.currency,
          status: inv.status,
          periodStart: inv.periodStart.toISOString(),
          periodEnd: inv.periodEnd.toISOString(),
          paidAt: inv.paidAt?.toISOString() ?? null,
          createdAt: inv.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    console.error("[subscription] Failed to fetch:", err);
    return NextResponse.json(
      { error: "Failed to load subscription details", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
