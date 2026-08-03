import { prisma } from "@/lib/prisma";

export type ConversionEventType =
  | "demo_booked"
  | "registered"
  | "onboarding_complete"
  | "trial_activated"
  | "paid_subscription"
  | "renewed"
  | "churned";

export class AttributionService {
  /**
   * Records a conversion event using last-touch attribution.
   * Looks up the most recent SENT/DELIVERED/OPENED/CLICKED campaign email
   * for the given contact email, then writes a CampaignConversion record.
   */
  static async recordLastTouch({
    contactEmail,
    eventType,
    schoolId,
    leadId,
    attributedRevenue,
    metadata,
  }: {
    contactEmail: string;
    eventType: ConversionEventType;
    schoolId?: string;
    leadId?: string;
    attributedRevenue?: number;
    metadata?: Record<string, unknown>;
  }): Promise<string | null> {
    const lastTouched = await prisma.campaignRecipient.findFirst({
      where: {
        email: contactEmail.toLowerCase().trim(),
        status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED"] },
      },
      orderBy: { sentAt: "desc" },
      select: { campaignId: true },
    });

    if (!lastTouched) {
      return null;
    }

    const conversion = await prisma.campaignConversion.create({
      data: {
        campaignId: lastTouched.campaignId,
        schoolId: schoolId ?? null,
        leadId: leadId ?? null,
        eventType,
        attributionModel: "last_touch",
        attributedRevenue: attributedRevenue ? attributedRevenue.toFixed(2) : null,
        metadata: (metadata as any) ?? null,
        convertedAt: new Date(),
      },
    });

    return conversion.id;
  }

  /**
   * Records a conversion event using first-touch attribution.
   * Looks up the oldest SENT/DELIVERED/OPENED/CLICKED campaign interaction for the given email.
   */
  static async recordFirstTouch({
    contactEmail,
    eventType,
    schoolId,
    leadId,
    attributedRevenue,
    metadata,
  }: {
    contactEmail: string;
    eventType: ConversionEventType;
    schoolId?: string;
    leadId?: string;
    attributedRevenue?: number;
    metadata?: Record<string, unknown>;
  }): Promise<string | null> {
    const firstTouched = await prisma.campaignRecipient.findFirst({
      where: {
        email: contactEmail.toLowerCase().trim(),
        status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED"] },
      },
      orderBy: { sentAt: "asc" },
      select: { campaignId: true },
    });

    if (!firstTouched) {
      return null;
    }

    const conversion = await prisma.campaignConversion.create({
      data: {
        campaignId: firstTouched.campaignId,
        schoolId: schoolId ?? null,
        leadId: leadId ?? null,
        eventType,
        attributionModel: "first_touch",
        attributedRevenue: attributedRevenue ? attributedRevenue.toFixed(2) : null,
        metadata: (metadata as any) ?? null,
        convertedAt: new Date(),
      },
    });

    return conversion.id;
  }

  /**
   * Records a conversion event using linear attribution.
   * Finds all distinct campaigns touched by the contact and splits the revenue equally among them.
   */
  static async recordLinear({
    contactEmail,
    eventType,
    schoolId,
    leadId,
    attributedRevenue,
    metadata,
  }: {
    contactEmail: string;
    eventType: ConversionEventType;
    schoolId?: string;
    leadId?: string;
    attributedRevenue?: number;
    metadata?: Record<string, unknown>;
  }): Promise<string[]> {
    const touchedRecipients = await prisma.campaignRecipient.findMany({
      where: {
        email: contactEmail.toLowerCase().trim(),
        status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED"] },
      },
      select: { campaignId: true },
    });

    const uniqueCampaignIds = Array.from(new Set(touchedRecipients.map((r) => r.campaignId)));
    if (uniqueCampaignIds.length === 0) {
      return [];
    }

    const splitRevenue = attributedRevenue ? attributedRevenue / uniqueCampaignIds.length : null;
    const conversionIds: string[] = [];

    for (const campaignId of uniqueCampaignIds) {
      const conversion = await prisma.campaignConversion.create({
        data: {
          campaignId,
          schoolId: schoolId ?? null,
          leadId: leadId ?? null,
          eventType,
          attributionModel: "linear",
          attributedRevenue: splitRevenue ? splitRevenue.toFixed(2) : null,
          metadata: (metadata as any) ?? null,
          convertedAt: new Date(),
        },
      });
      conversionIds.push(conversion.id);
    }

    return conversionIds;
  }

  /**
   * Returns conversion records attributed to a given campaign,
   * optionally filtered by attribution model.
   */
  static async getCampaignConversions(campaignId: string, model: string = "last_touch") {
    const conversions = await prisma.campaignConversion.findMany({
      where: { campaignId, attributionModel: model },
      orderBy: { convertedAt: "desc" },
    });

    const byEventType = conversions.reduce<Record<string, number>>((acc, c) => {
      acc[c.eventType] = (acc[c.eventType] ?? 0) + 1;
      return acc;
    }, {});

    const totalRevenue = conversions.reduce((sum, c) => {
      return sum + (c.attributedRevenue ? Number(c.attributedRevenue) : 0);
    }, 0);

    return { conversions, byEventType, totalRevenue };
  }
}
