import { prisma } from "@/lib/prisma";
import { CampaignAudienceResolver, SegmentType } from "./audience-resolver.service";
import { ResendEmailDispatcher } from "../dispatchers/resend-email.dispatcher";
import { DeliveryStatus } from "@/generated/prisma";

function replacePlaceholders(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export class CampaignDispatchService {
  private static dispatcher = new ResendEmailDispatcher();

  /**
   * Resolves the target audience segment and populates CampaignRecipient table in QUEUED state.
   */
  static async prepareCampaignRecipients(campaignId: string): Promise<number> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }

    // Resolve audience based on the filter
    const audienceFilter = campaign.audienceFilter as { segment: SegmentType };
    const segment = audienceFilter?.segment;

    if (!segment) {
      throw new Error("No segment specified in campaign filters");
    }

    const recipients = await CampaignAudienceResolver.resolveSegment(segment);

    // Delete existing queued/pending recipients for this campaign to avoid constraints conflicts on recalculation
    await prisma.campaignRecipient.deleteMany({
      where: {
        campaignId,
        status: { in: ["QUEUED", "PROCESSING"] },
      },
    });

    // Bulk insert candidates
    if (recipients.length > 0) {
      const data = recipients.map((r) => ({
        campaignId,
        leadId: r.type === "lead" ? r.id : null,
        email: r.email,
        firstName: r.firstName,
        schoolName: r.schoolName,
        status: "QUEUED" as DeliveryStatus,
      }));

      await prisma.campaignRecipient.createMany({
        data,
        skipDuplicates: true,
      });
    }

    // Update campaign total recipient count
    const totalCount = await prisma.campaignRecipient.count({
      where: { campaignId },
    });

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { recipientCount: totalCount },
    });

    return totalCount;
  }

  /**
   * Loops through and dispatches queued recipients for a campaign.
   */
  static async dispatchCampaignNow(campaignId: string): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.status === "COMPLETED") {
      return;
    }

    // Update campaign state
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

    // Fetch queued recipients
    const queuedRecipients = await prisma.campaignRecipient.findMany({
      where: {
        campaignId,
        status: "QUEUED",
      },
    });

    let sent = 0;
    let failed = 0;

    for (const r of queuedRecipients) {
      // Re-verify recipient state for concurrency safety (idempotency key lookup)
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { id: r.id },
      });

      if (!recipient || recipient.status !== "QUEUED") {
        continue;
      }

      // Mark recipient as PROCESSING to prevent double send
      await prisma.campaignRecipient.update({
        where: { id: r.id },
        data: { status: "PROCESSING" },
      });

      // Prepare replacements
      const replacements = {
        firstName: r.firstName,
        schoolName: r.schoolName || "your school",
        unsubscribe: `https://wardbalance.com/unsubscribe?email=${encodeURIComponent(r.email)}`,
      };

      const subject = replacePlaceholders(campaign.subject, replacements);
      const htmlBody = replacePlaceholders(campaign.htmlBody, replacements);
      const textBody = campaign.textBody ? replacePlaceholders(campaign.textBody, replacements) : "";

      // Idempotency key derived from campaign and recipient
      const idempotencyKey = `campaign-recipient-${r.id}`;

      // Dispatch
      const result = await this.dispatcher.send({
        recipientId: r.id,
        recipientContact: r.email,
        firstName: r.firstName,
        subject,
        htmlBody,
        textBody,
        idempotencyKey,
      });

      if (result.success) {
        await prisma.campaignRecipient.update({
          where: { id: r.id },
          data: {
            status: "SENT",
            resendId: result.providerId,
            sentAt: new Date(),
            errorLog: null,
          },
        });
        sent++;
      } else {
        await prisma.campaignRecipient.update({
          where: { id: r.id },
          data: {
            status: "FAILED",
            errorLog: result.error || "Failed delivery",
          },
        });
        failed++;
      }
    }

    // Mark campaign as completed
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        sentCount: { increment: sent },
        failedCount: { increment: failed },
      },
    });
  }
}
