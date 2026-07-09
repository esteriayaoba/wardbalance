import { prisma } from "@/lib/prisma";
import { getProvider } from "./providers/registry";
import type { SendOptions } from "./providers/interface";

export interface EnqueueOptions {
  schoolId: string;
  parentId?: string;
  userId?: string;
  channel: "email" | "sms";
  recipient: string;
  subject?: string;
  content: string;
  reference?: string;
  trigger?: string;
  template?: string;
}

export async function enqueueNotification(opts: EnqueueOptions) {
  await prisma.notificationOutbox.create({
    data: {
      schoolId: opts.schoolId,
      parentId: opts.parentId ?? "",
      channel: opts.channel,
      status: "pending",
      recipient: opts.recipient,
      subject: opts.subject ?? "",
      content: opts.content,
      reference: opts.reference ?? "",
    },
  });
}

export interface SendOneOptions {
  channel: "email" | "sms";
  recipient: string;
  subject?: string;
  html?: string;
  text?: string;
  reference?: string;
}

export async function sendNotification(opts: SendOneOptions) {
  const provider = getProvider(opts.channel);
  const sendOpts: SendOptions = {
    to: opts.recipient,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    reference: opts.reference,
  };
  return provider.send(sendOpts);
}

export async function processOutboxItem(outboxId: string): Promise<boolean> {
  const item = await prisma.notificationOutbox.findUnique({
    where: { id: outboxId },
  });
  if (!item) return false;
  if (item.status === "sent" || item.status === "failed") return true;

  await prisma.notificationOutbox.update({
    where: { id: outboxId },
    data: { status: "processing" },
  });

  const provider = getProvider(item.channel);
  const result = await provider.send({
    to: item.recipient,
    subject: item.subject || undefined,
    html: item.content,
    text: item.channel === "sms" ? item.content : undefined,
    reference: item.reference || undefined,
  });

  if (result.success) {
    await prisma.notificationOutbox.update({
      where: { id: outboxId },
      data: { status: "sent", processedAt: new Date() },
    });
    return true;
  }

  const updated = await prisma.notificationOutbox.update({
    where: { id: outboxId },
    data: {
      retryCount: { increment: 1 },
      errorLog: result.error,
      status: item.retryCount + 1 >= (item.maxRetries ?? 3) ? "failed" : "pending",
    },
  });

  return updated.status === "sent";
}
