import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { getMilestones } from "@/lib/lifecycle/events";
import { evaluateStage } from "@/lib/lifecycle/stages";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner"]);
    if (!guard.authorized) return guard.response;

    const schoolId = guard.session.schoolId;

    const milestones = await getMilestones(schoolId);
    const lastLogin = await prisma.auditLog.findFirst({
      where: { schoolId, actorId: guard.session.userId, action: { in: ["auth.login", "auth.email_verified"] } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const daysSinceLastLogin = lastLogin
      ? Math.floor((Date.now() - new Date(lastLogin.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const stage = await evaluateStage(schoolId, daysSinceLastLogin);

    return NextResponse.json({
      data: {
        stage,
        milestones,
        daysSinceLastLogin,
      },
    });
  } catch (err) {
    console.error("[lifecycle] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch lifecycle data", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
