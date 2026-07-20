import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";

export async function GET() {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const plans = await prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      data: plans.map((p) => ({
        id: p.id,
        name: p.name,
        tier: p.tier,
        price: Number(p.price),
        currency: p.currency,
        billingPeriod: p.billingPeriod,
        features: p.features,
        limits: p.limits,
      })),
    });
  } catch (err) {
    console.error("[subscription/plans] Failed:", err);
    return NextResponse.json(
      { error: "Failed to load plans", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
