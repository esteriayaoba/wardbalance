import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requirePlatformRole(["PlatformAdmin", "Marketing", "CustomerSuccess", "Support"]);
  if (!auth.authorized) return auth.response;

  try {
    const templates = await prisma.campaignTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch templates", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
