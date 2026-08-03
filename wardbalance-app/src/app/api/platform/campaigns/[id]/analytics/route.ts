import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { CampaignAnalyticsService } from "@/modules/growth/services/analytics.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  
  const { id } = await params;const auth = await requirePlatformRole(["PlatformAdmin", "Marketing", "CustomerSuccess", "Support"]);
  if (!auth.authorized) return auth.response;

  try {
    const comparison = await CampaignAnalyticsService.getCampaignComparison(id);
    return NextResponse.json(comparison);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch campaign analytics", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
