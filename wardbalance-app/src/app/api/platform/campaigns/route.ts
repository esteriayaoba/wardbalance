import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { CampaignGoal } from "@/generated/prisma";
import { z } from "zod";

const CreateCampaignSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  previewText: z.string().optional(),
  goal: z.nativeEnum(CampaignGoal, { message: "Valid Campaign Goal is required" }),
  templateId: z.string().optional(),
  htmlBody: z.string().min(1, "HTML Body is required"),
  textBody: z.string().optional(),
  segment: z.string().min(1, "Segment selection is required"),
});

export async function GET() {
  const auth = await requirePlatformRole(["PlatformAdmin", "Marketing", "CustomerSuccess", "Support"]);
  if (!auth.authorized) return auth.response;

  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ campaigns });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch campaigns", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformRole(["PlatformAdmin", "Marketing"]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const parsed = CreateCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const utmCampaign = data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        subject: data.subject,
        previewText: data.previewText || null,
        goal: data.goal,
        templateId: data.templateId || null,
        htmlBody: data.htmlBody,
        textBody: data.textBody || null,
        utmCampaign,
        audienceFilter: { segment: data.segment },
        status: "DRAFT",
        createdById: auth.session.userId,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create campaign", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
