import { prisma } from "@/lib/prisma";
import { CampaignDispatchService } from "@/modules/growth/services/dispatch.service";
import { JourneyTriggerService } from "@/modules/growth/services/journey-trigger.service";
import { JourneyExecutorService } from "@/modules/growth/services/journey-executor.service";
import { NextRequest, NextResponse } from "next/server";

/**
 * Vercel Cron endpoint — runs every 15 minutes.
 * 1. Scans and enrolls contacts into active growth journeys.
 * 2. Advances due journey steps (Email / SMS).
 * 3. Dispatches scheduled campaigns.
 *
 * Secured via CRON_SECRET header to prevent unauthorized triggers.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Scan and enroll contacts into active journeys
  let journeyTriggers: { enrolledCount: number; journeysScanned: number } = { enrolledCount: 0, journeysScanned: 0 };
  try {
    journeyTriggers = await JourneyTriggerService.scanAndEnroll();
  } catch (err: any) {
    console.error("[cron-journey-trigger] Error:", err.message);
  }

  // 2. Process ready journey steps
  let journeyExecutions: { executedCount: number; completedCount: number; exitedCount: number } = { executedCount: 0, completedCount: 0, exitedCount: 0 };
  try {
    journeyExecutions = await JourneyExecutorService.processReadySteps();
  } catch (err: any) {
    console.error("[cron-journey-executor] Error:", err.message);
  }

  // 3. Dispatch due scheduled campaigns
  const now = new Date();
  const due = await prisma.campaign.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
    select: { id: true, name: true },
  });

  const campaignResults: { id: string; name: string; success: boolean; error?: string }[] = [];

  for (const campaign of due) {
    try {
      await CampaignDispatchService.prepareCampaignRecipients(campaign.id);
      await CampaignDispatchService.dispatchCampaignNow(campaign.id);
      campaignResults.push({ id: campaign.id, name: campaign.name, success: true });
    } catch (err: any) {
      console.error(`[cron-campaign-dispatch] Failed campaign ${campaign.id}:`, err.message);
      campaignResults.push({ id: campaign.id, name: campaign.name, success: false, error: err.message });
    }
  }

  return NextResponse.json({
    journeys: {
      scanned: journeyTriggers.journeysScanned,
      newlyEnrolled: journeyTriggers.enrolledCount,
      stepsExecuted: journeyExecutions.executedCount,
      enrollmentsCompleted: journeyExecutions.completedCount,
      enrollmentsExited: journeyExecutions.exitedCount,
    },
    campaigns: {
      dispatched: campaignResults.filter((r) => r.success).length,
      failed: campaignResults.filter((r) => !r.success).length,
      results: campaignResults,
    },
  });
}
