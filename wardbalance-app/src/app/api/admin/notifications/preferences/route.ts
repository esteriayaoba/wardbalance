import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PreferenceSchema = z.object({
  channel: z.enum(["email", "sms"]),
  category: z.enum(["marketing", "product_updates", "reminders"]),
  subscribed: z.boolean(),
});

export async function GET(_request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const prefs = await prisma.notificationPreference.findMany({
      where: { schoolId: guard.session.schoolId, userId: guard.session.userId },
    });

    return NextResponse.json({ data: prefs });
  } catch (err) {
    console.error("[notifications/preferences] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch preferences", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = PreferenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { channel, category, subscribed } = parsed.data;

    const pref = await prisma.notificationPreference.upsert({
      where: {
        schoolId_userId_parentId_channel_category: {
          schoolId: guard.session.schoolId,
          userId: guard.session.userId,
          parentId: "none",
          channel,
          category,
        },
      },
      create: {
        schoolId: guard.session.schoolId,
        userId: guard.session.userId,
        parentId: "none",
        channel,
        category,
        subscribed,
      },
      update: { subscribed },
    });

    return NextResponse.json({ data: pref, message: "Preference updated." });
  } catch (err) {
    console.error("[notifications/preferences] POST error:", err);
    return NextResponse.json({ error: "Failed to update preference", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
