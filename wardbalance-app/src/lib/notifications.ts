import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma/client";

export async function enqueueNotification(
  data: {
    schoolId: string;
    parentId: string;
    channel: "email" | "sms";
    recipient: string;
    subject?: string;
    content: string;
    reference?: string;
  },
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;

  const parentLinks = await db.parentWardLink.findMany({
    where: { parentId: data.parentId, schoolId: data.schoolId },
  });

  const anyLinkWantsNotifications = parentLinks.some(link => link.receivesInvoiceNotifications);

  if (parentLinks.length > 0 && !anyLinkWantsNotifications) {
    console.log(`[Notification] Skipped ${data.channel} to ${data.recipient}: all preferences opted out.`);
    return null;
  }

  const outboxRecord = await db.notificationOutbox.create({
    data: {
      schoolId: data.schoolId,
      parentId: data.parentId,
      channel: data.channel,
      status: "pending",
      recipient: data.recipient,
      subject: data.subject,
      content: data.content,
      reference: data.reference,
      retryCount: 0,
      maxRetries: 3,
    },
  });

  return outboxRecord;
}
