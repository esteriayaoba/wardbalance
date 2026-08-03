import { prisma } from "@/lib/prisma";
import { AttributionService } from "./attribution.service";

const GOAL_EVENT_MAP: Record<string, string> = {
  INCREASE_DEMO_BOOKINGS: "demo_booked",
  ACTIVATE_NEW_SCHOOLS:   "registered",
  COMPLETE_ONBOARDING:    "onboarding_complete",
  TRIAL_CONVERSION:       "paid_subscription",
  SUBSCRIPTION_RENEWAL:   "renewed",
  PRODUCT_ANNOUNCEMENT:   "clicked",   // primary KPI is engagement
  NEWSLETTER:             "opened",    // primary KPI is open rate
};

export interface CampaignHealthMetrics {
  campaignId:       string;
  goal:             string;
  recipientCount:   number;
  sentCount:        number;
  deliveryRate:     number;
  bounceRate:       number;
  openRate:         number;
  clickRate:        number;
  unsubscribeRate:  number;
  complaintRate:    number;
  // Business outcomes
  demoBookings:         number;
  registrations:        number;
  onboardingCompletions: number;
  trialActivations:     number;
  paidSubscriptions:    number;
  renewals:             number;
  attributedRevenue:    number;
  // Primary goal performance
  primaryGoalCount:     number;
  primaryGoalEvent:     string;
}

export interface CampaignAnalyticsComparison {
  current:  CampaignHealthMetrics;
  previous: CampaignHealthMetrics | null;
  deltas: {
    deliveryRate:    number | null;
    openRate:        number | null;
    clickRate:       number | null;
    bounceRate:      number | null;
    unsubscribeRate: number | null;
    primaryGoalCount: number | null;
    attributedRevenue: number | null;
  };
}

export class CampaignAnalyticsService {
  /**
   * Full metrics for a single campaign, including business outcomes filtered by attribution model.
   */
  static async getCampaignMetrics(
    campaignId: string,
    model: string = "last_touch"
  ): Promise<CampaignHealthMetrics> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { goal: true },
    });

    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    const total = await prisma.campaignRecipient.count({ where: { campaignId } });

    if (total === 0) {
      return this.emptyMetrics(campaignId, campaign.goal ?? "NEWSLETTER");
    }

    const [sent, bounced, opened, clicked, unsubscribed, complained] = await Promise.all([
      prisma.campaignRecipient.count({
        where: { campaignId, status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED", "CONVERTED", "UNSUBSCRIBED"] } },
      }),
      prisma.campaignRecipient.count({ where: { campaignId, status: "BOUNCED" } }),
      prisma.campaignRecipient.count({
        where: { campaignId, status: { in: ["OPENED", "CLICKED", "CONVERTED"] } },
      }),
      prisma.campaignRecipient.count({
        where: { campaignId, status: { in: ["CLICKED", "CONVERTED"] } },
      }),
      prisma.campaignRecipient.count({ where: { campaignId, status: "UNSUBSCRIBED" } }),
      prisma.campaignRecipient.count({
        where: { campaignId, complainedAt: { not: null } },
      }),
    ]);

    // Business outcomes from CampaignConversion by attribution model
    const { byEventType, totalRevenue } = await AttributionService.getCampaignConversions(campaignId, model);

    const goalEventKey = campaign.goal ? String(campaign.goal) : "NEWSLETTER";
    const primaryGoalEvent = GOAL_EVENT_MAP[goalEventKey] ?? "opened";
    const primaryGoalCount = byEventType[primaryGoalEvent] ?? 0;

    const pct = (num: number, denom: number) =>
      denom > 0 ? Math.round((num / denom) * 1000) / 10 : 0;

    return {
      campaignId,
      goal:             goalEventKey,
      recipientCount:   total,
      sentCount:        sent,
      deliveryRate:     pct(sent, total),
      bounceRate:       pct(bounced, total),
      openRate:         pct(opened, sent),
      clickRate:        pct(clicked, sent),
      unsubscribeRate:  pct(unsubscribed, sent),
      complaintRate:    pct(complained, sent),
      demoBookings:         byEventType["demo_booked"] ?? 0,
      registrations:        byEventType["registered"] ?? 0,
      onboardingCompletions: byEventType["onboarding_complete"] ?? 0,
      trialActivations:     byEventType["trial_activated"] ?? 0,
      paidSubscriptions:    byEventType["paid_subscription"] ?? 0,
      renewals:             byEventType["renewed"] ?? 0,
      attributedRevenue:    totalRevenue,
      primaryGoalCount,
      primaryGoalEvent,
    };
  }

  /**
   * Returns current campaign metrics plus period-over-period deltas
   * compared against the most recent completed campaign with the same goal.
   */
  static async getCampaignComparison(
    campaignId: string,
    model: string = "last_touch"
  ): Promise<CampaignAnalyticsComparison> {
    const current = await this.getCampaignMetrics(campaignId, model);

    const previousCampaign = await prisma.campaign.findFirst({
      where: {
        goal:   current.goal as any,
        status: "COMPLETED",
        id:     { not: campaignId },
      },
      orderBy: { completedAt: "desc" },
      select: { id: true },
    });

    if (!previousCampaign) {
      return { current, previous: null, deltas: this.nullDeltas() };
    }

    const previous = await this.getCampaignMetrics(previousCampaign.id, model);

    const delta = (cur: number, prev: number) =>
      Math.round((cur - prev) * 10) / 10;

    return {
      current,
      previous,
      deltas: {
        deliveryRate:     delta(current.deliveryRate,    previous.deliveryRate),
        openRate:         delta(current.openRate,        previous.openRate),
        clickRate:        delta(current.clickRate,       previous.clickRate),
        bounceRate:       delta(current.bounceRate,      previous.bounceRate),
        unsubscribeRate:  delta(current.unsubscribeRate, previous.unsubscribeRate),
        primaryGoalCount: current.primaryGoalCount - previous.primaryGoalCount,
        attributedRevenue: current.attributedRevenue - previous.attributedRevenue,
      },
    };
  }

  private static emptyMetrics(campaignId: string, goal: string): CampaignHealthMetrics {
    const primaryGoalEvent = GOAL_EVENT_MAP[goal] ?? "opened";
    return {
      campaignId, goal, recipientCount: 0, sentCount: 0,
      deliveryRate: 0, bounceRate: 0, openRate: 0, clickRate: 0,
      unsubscribeRate: 0, complaintRate: 0,
      demoBookings: 0, registrations: 0, onboardingCompletions: 0,
      trialActivations: 0, paidSubscriptions: 0, renewals: 0,
      attributedRevenue: 0, primaryGoalCount: 0, primaryGoalEvent,
    };
  }

  private static nullDeltas() {
    return {
      deliveryRate: null, openRate: null, clickRate: null,
      bounceRate: null, unsubscribeRate: null,
      primaryGoalCount: null, attributedRevenue: null,
    };
  }
}
