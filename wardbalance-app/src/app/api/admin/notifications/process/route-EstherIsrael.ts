import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError, logWarn } from "@/lib/logger";
import { processOutboxItem } from "@/lib/notifications/notification-service";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pendingNotifications = await prisma.notificationOutbox.findMany({
      where: { status: "pending", retryCount: { lt: 3 } },
      take: 20,
      orderBy: { createdAt: "asc" },
    });

    if (pendingNotifications.length === 0) {
      return NextResponse.json({ processed: 0, message: "No pending notifications." });
    }

    let processedCount = 0;
    let failedCount = 0;

    for (const notification of pendingNotifications) {
      const acquired = await prisma.notificationOutbox.updateMany({
        where: { id: notification.id, status: "pending" },
        data: { status: "processing" },
      });
      if (acquired.count === 0) continue;

      const ok = await processOutboxItem(notification.id);
      if (ok) processedCount++;
      else failedCount++;
    }

    return NextResponse.json({ processed: processedCount, failed: failedCount });
  } catch (err) {
    logError("notification-process", err);
    return NextResponse.json(
      { error: "Internal processing error", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
