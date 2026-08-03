import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { CampaignAudienceResolver, SegmentType } from "@/modules/growth/services/audience-resolver.service";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  
  const { id } = await params;const auth = await requirePlatformRole(["PlatformAdmin", "Marketing", "CustomerSuccess", "Support"]);
  if (!auth.authorized) return auth.response;

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const audienceFilter = campaign.audienceFilter as { segment: SegmentType };
    const segment = audienceFilter?.segment;

    if (!segment) {
      return NextResponse.json({ error: "No segment defined for campaign", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const estimation = await CampaignAudienceResolver.estimateAudience(segment);

    return NextResponse.json({ estimation });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to calculate audience preview", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
