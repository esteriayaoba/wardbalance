import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  
  const { id } = await params;const auth = await requirePlatformRole(["PlatformAdmin", "Marketing"]);
  if (!auth.authorized) return auth.response;

  try {
    const journey = await prisma.journey.findUnique({
      where: { id: id },
      select: { id: true, isActive: true },
    });

    if (!journey) {
      return NextResponse.json({ error: "Journey not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const updated = await prisma.journey.update({
      where: { id: id },
      data: { isActive: !journey.isActive },
    });

    return NextResponse.json({
      message: `Journey ${updated.isActive ? "activated" : "deactivated"} successfully`,
      isActive: updated.isActive,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to toggle journey state", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
