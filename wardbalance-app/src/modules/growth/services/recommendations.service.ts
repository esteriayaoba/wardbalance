import { prisma } from "@/lib/prisma";
import { CampaignAudienceResolver } from "./audience-resolver.service";
import { SchoolHealthEvaluator } from "./health-evaluator.service";

export interface CampaignRecommendation {
  id: string;
  priority: "critical" | "high" | "medium";
  title: string;
  rationale: string;
  recommendedAction: "launch_journey" | "create_campaign";
  journeyTrigger?: string;
  campaignSegment?: string;
  campaignTemplateCategory?: string;
  estimatedReach: number;
}

export class RecommendationsService {
  /**
   * Evaluates business state and returns ranked growth recommendations.
   */
  static async getRecommendations(): Promise<CampaignRecommendation[]> {
    const list: CampaignRecommendation[] = [];

    // Check active journeys
    const activeJourneys = await prisma.journey.findMany({
      where: { isActive: true },
      select: { trigger: true },
    });
    const activeTriggers = new Set(activeJourneys.map((j) => j.trigger));

    // 1. Check Expiring Trials
    const trialExpiringCount = (await CampaignAudienceResolver.resolveSegment("TRIAL_EXPIRING")).length;
    if (trialExpiringCount > 0 && !activeTriggers.has("TRIAL_EXPIRING_3D")) {
      list.push({
        id: "rec_launch_trial_journey",
        priority: "critical",
        title: "Automate Trial Expirations Sequence",
        rationale: `${trialExpiringCount} school(s) have free trials expiring in 3 days. No automated journey is currently active.`,
        recommendedAction: "launch_journey",
        journeyTrigger: "TRIAL_EXPIRING_3D",
        estimatedReach: trialExpiringCount,
      });
    }

    // 2. Check At-Risk Portals
    const healthDist = await SchoolHealthEvaluator.getHealthDistribution();
    if (healthDist.at_risk > 0 && !activeTriggers.has("HEALTH_AT_RISK")) {
      list.push({
        id: "rec_launch_at_risk_journey",
        priority: "critical",
        title: "Automate At-Risk Customer Win-Back",
        rationale: `${healthDist.at_risk} active school(s) show severe drop in usage indicators. Activate an automated care journey.`,
        recommendedAction: "launch_journey",
        journeyTrigger: "HEALTH_AT_RISK",
        estimatedReach: healthDist.at_risk,
      });
    }

    // 3. Check Uninvoiced Onboarded Schools
    const neverCreatedInvoiceCount = (await CampaignAudienceResolver.resolveSegment("NEVER_CREATED_INVOICE")).length;
    if (neverCreatedInvoiceCount > 0) {
      list.push({
        id: "rec_invoice_setup_campaign",
        priority: "high",
        title: "Dispatch Invoicing Setup Nudge",
        rationale: `${neverCreatedInvoiceCount} school(s) completed onboarding but have not generated fee invoices for parents.`,
        recommendedAction: "create_campaign",
        campaignSegment: "NEVER_CREATED_INVOICE",
        campaignTemplateCategory: "invoice_reminder",
        estimatedReach: neverCreatedInvoiceCount,
      });
    }

    // 4. Check New Lead Welcome Sequence
    const newLeadsCount = (await CampaignAudienceResolver.resolveSegment("NEW_LEADS")).length;
    if (newLeadsCount > 0 && !activeTriggers.has("NEW_LEAD")) {
      list.push({
        id: "rec_new_lead_journey",
        priority: "high",
        title: "Activate New Lead Welcome Journey",
        rationale: `${newLeadsCount} landing page prospect(s) are awaiting onboarding outreach.`,
        recommendedAction: "launch_journey",
        journeyTrigger: "NEW_LEAD",
        estimatedReach: newLeadsCount,
      });
    }

    // 5. Check Recent Campaign Open Performance
    const recentCampaigns = await prisma.campaign.findMany({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 5,
    });

    if (recentCampaigns.length > 0) {
      const avgOpenRate =
        recentCampaigns.reduce((sum, c) => {
          const rate = c.recipientCount > 0 ? (c.sentCount / c.recipientCount) * 100 : 0;
          return sum + rate;
        }, 0) / recentCampaigns.length;

      if (avgOpenRate < 25) {
        list.push({
          id: "rec_template_refresh",
          priority: "medium",
          title: "Refresh Email Template Messaging",
          rationale: `Recent campaign open rates average ${Math.round(avgOpenRate)}%. Try utilizing pre-tested templates from the library.`,
          recommendedAction: "create_campaign",
          campaignSegment: "ALL_LEADS",
          campaignTemplateCategory: "newsletter",
          estimatedReach: 0,
        });
      }
    }

    // Sort priority
    const priorityMap = { critical: 3, high: 2, medium: 1 };
    list.sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);

    return list;
  }
}
