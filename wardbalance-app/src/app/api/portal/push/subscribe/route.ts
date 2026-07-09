import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "Parent") {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = SubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid subscription data", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { endpoint, keys } = parsed.data;

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        schoolId: session.schoolId,
        parentId: session.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ data: { subscribed: true }, message: "Push subscription saved." });
  } catch (err) {
    console.error("[push/subscribe] Error:", err);
    return NextResponse.json({ error: "Failed to save subscription", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
