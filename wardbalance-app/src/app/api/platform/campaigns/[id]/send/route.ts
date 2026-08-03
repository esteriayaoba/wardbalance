import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { CampaignDispatchService } from "@/modules/growth/services/dispatch.service";

// Support Next.js after() if available
let afterFunc: any = null;
try {
  const nextServer = require("next/server");
  afterFunc = nextServer.after;
} catch (_) {
  // after is not supported or not configured in this next.js version
}

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requirePlatformRole(["PlatformAdmin", "Marketing"]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const { scheduledAt } = body as { scheduledAt?: string };

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (campaign.status === "PROCESSING" || campaign.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Campaign is already processing or completed", code: "INVALID_STATE" },
        { status: 400 }
      );
    }

    // --- SCHEDULED send ---
    if (scheduledAt) {
      const scheduleDate = new Date(scheduledAt);
      if (isNaN(scheduleDate.getTime()) || scheduleDate <= new Date()) {
        return NextResponse.json(
          { error: "scheduledAt must be a valid future ISO timestamp", code: "VALIDATION_ERROR" },
          { status: 400 }
        );
      }

      await prisma.campaign.update({
        where: { id: params.id },
        data: { status: "SCHEDULED", scheduledAt: scheduleDate },
      });

      return NextResponse.json({
        message: `Campaign scheduled for ${scheduleDate.toISOString()}`,
        scheduledAt: scheduleDate.toISOString(),
      });
    }

    // --- IMMEDIATE send ---
    const totalRecipients = await CampaignDispatchService.prepareCampaignRecipients(params.id);

    if (totalRecipients === 0) {
      return NextResponse.json(
        { error: "Resolved audience has 0 eligible recipients. No emails were sent.", code: "EMPTY_AUDIENCE" },
        { status: 400 }
      );
    }

    if (afterFunc) {
      afterFunc(async () => {
        try {
          await CampaignDispatchService.dispatchCampaignNow(params.id);
        } catch (dispatchError) {
          console.error(`[campaign-dispatch-error] Failed to dispatch campaign ${params.id}:`, dispatchError);
        }
      });
    } else {
      CampaignDispatchService.dispatchCampaignNow(params.id).catch((dispatchError) => {
        console.error(`[campaign-dispatch-error] Background dispatch failed for campaign ${params.id}:`, dispatchError);
      });
    }

    await prisma.campaign.update({
      where: { id: params.id },
      data: { status: "PROCESSING" },
    });

    return NextResponse.json({
      message: "Campaign queued successfully for background dispatch",
      recipientCount: totalRecipients,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to trigger campaign sending", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
