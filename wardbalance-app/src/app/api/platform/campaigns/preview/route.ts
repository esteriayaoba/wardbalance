import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { CampaignAudienceResolver, type SegmentType } from "@/modules/growth/services/audience-resolver.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformRole(["PlatformAdmin", "Marketing", "CustomerSuccess", "Support"]);
  if (!auth.authorized) return auth.response;

  const segment = request.nextUrl.searchParams.get("segment") as SegmentType | null;

  if (!segment) {
    return NextResponse.json(
      { error: "segment query parameter is required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  try {
    const estimation = await CampaignAudienceResolver.estimateAudience(segment);

    // Resolve full list to get a sample (first 5 recipients)
    const resolved = await CampaignAudienceResolver.resolveSegment(segment);
    const sampleRecipients = resolved.slice(0, 5).map((r) => ({
      email: r.email,
      firstName: r.firstName,
      schoolName: r.schoolName,
    }));

    return NextResponse.json({
      segment: estimation.segment,
      eligibleCount: estimation.eligibleCount,
      suppressedCount: estimation.suppressedCount,
      invalidEmailCount: estimation.invalidCount,
      unsubscribedCount: 0, // populated from suppression list (already included in suppressedCount)
      finalRecipientCount: estimation.finalCount,
      sampleRecipients,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to estimate audience", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
