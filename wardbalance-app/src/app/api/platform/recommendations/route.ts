import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { RecommendationsService } from "@/modules/growth/services/recommendations.service";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requirePlatformRole(["PlatformAdmin", "Marketing", "CustomerSuccess", "Support"]);
  if (!auth.authorized) return auth.response;

  try {
    const recommendations = await RecommendationsService.getRecommendations();
    return NextResponse.json({ recommendations });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch recommendations", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
