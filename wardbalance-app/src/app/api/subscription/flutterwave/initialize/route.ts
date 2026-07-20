import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { z } from "zod";

const InitializeSchema = z.object({
  planId: z.enum(["starter_free", "pro_term", "group_custom"]),
});

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner"]);
    if (!guard.authorized) return guard.response;

    const schoolId = guard.session.schoolId;

    const body = await request.json();
    const parsed = InitializeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { planId } = parsed.data;

    const plan = await prisma.pricingPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { error: "Invalid or inactive plan", code: "PLAN_INVALID" },
        { status: 400 },
      );
    }

    if (Number(plan.price) <= 0) {
      return NextResponse.json(
        { error: "This plan doesn't require payment", code: "FREE_PLAN" },
        { status: 400 },
      );
    }

    const subscription = await prisma.schoolSubscription.findUnique({
      where: { schoolId },
      select: { id: true },
    });
    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription found", code: "NO_SUBSCRIPTION" },
        { status: 404 },
      );
    }

    // Build Flutterwave payload
    const flwSecretKey = process.env.FLW_SECRET_KEY;
    if (!flwSecretKey || flwSecretKey === "mock") {
      // Dev/mock mode — return a fake checkout URL
      return NextResponse.json({
        data: {
          checkoutUrl: `/admin/settings/subscription?mock_payment=1&planId=${planId}`,
          mock: true,
        },
      });
    }

    const txRef = `SUB-${schoolId}-${Date.now()}`;
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin/settings/subscription?flutterwave_status=callback`;

    const flwPayload = {
      tx_ref: txRef,
      amount: Number(plan.price),
      currency: "NGN",
      redirect_url: redirectUrl,
      customer: {
        email: guard.session.email,
        name: guard.session.fullName ?? guard.session.email,
      },
      meta: {
        subscriptionId: subscription.id,
        schoolId,
        planId,
        action: "subscription_upgrade",
      },
      customizations: {
        title: "WardBalance Subscription",
        description: `${plan.name} Plan — ${plan.billingPeriod ?? "term"}`,
      },
    };

    const flwRes = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${flwSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(flwPayload),
    });

    const flwJson = await flwRes.json();

    if (!flwRes.ok || !flwJson.data?.link) {
      console.error("[subscription/initialize] Flutterwave error:", flwJson);
      return NextResponse.json(
        { error: "Payment gateway unavailable. Please try again.", code: "FLW_ERROR" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      data: {
        checkoutUrl: flwJson.data.link,
        txRef,
        mock: false,
      },
    });
  } catch (err) {
    console.error("[subscription/initialize] Failed:", err);
    return NextResponse.json(
      { error: "Failed to initialize payment", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
