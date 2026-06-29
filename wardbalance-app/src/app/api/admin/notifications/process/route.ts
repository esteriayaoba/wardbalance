import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";
import { sendTermiiSMS } from "@/lib/termii";
import { logError, logWarn } from "@/lib/logger";

interface ProcessError {
  id: string;
  error: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pendingNotifications = await prisma.notificationOutbox.findMany({
      where: { status: "pending", retryCount: { lt: prisma.notificationOutbox.fields.maxRetries } },
      take: 20,
      orderBy: { createdAt: "asc" },
    });

    if (pendingNotifications.length === 0) {
      return NextResponse.json({ processed: 0, message: "No pending notifications." });
    }

    let processedCount = 0;
    const errors: ProcessError[] = [];

    for (const notification of pendingNotifications) {
      const acquired = await prisma.notificationOutbox.updateMany({
        where: { id: notification.id, status: "pending" },
        data: { status: "processing" },
      });

      if (acquired.count === 0) continue;

      try {
        if (notification.channel === "email") {
          const { error } = await sendEmail({
            to: notification.recipient,
            subject: notification.subject ?? "Notification from WardBalance",
            html: notification.content,
          });
          if (error) throw error;
        } else if (notification.channel === "sms") {
          await sendTermiiSMS(notification.recipient, notification.content);
        }

        await prisma.notificationOutbox.update({
          where: { id: notification.id },
          data: { status: "sent", processedAt: new Date() },
        });
        processedCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        logWarn("notification-process", `Failed to send ${notification.id}: ${message}`);

        const newRetryCount = notification.retryCount + 1;
        const willRetry = newRetryCount < notification.maxRetries;

        await prisma.notificationOutbox.update({
          where: { id: notification.id },
          data: {
            status: willRetry ? "pending" : "failed",
            errorLog: message,
            retryCount: newRetryCount,
            processedAt: willRetry ? null : new Date(),
          },
        });

        if (!willRetry) {
          errors.push({ id: notification.id, error: message });
        }
      }
    }

    return NextResponse.json({ processed: processedCount, failed: errors.length, errors });
  } catch (err) {
    logError("notification-process", err);
    return NextResponse.json(
      { error: "Internal processing error", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
