import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { CampaignGoal } from "@/generated/prisma";
import { z } from "zod";

const UpdateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  previewText: z.string().optional(),
  goal: z.nativeEnum(CampaignGoal).optional(),
  templateId: z.string().optional(),
  htmlBody: z.string().min(1).optional(),
  textBody: z.string().optional(),
  segment: z.string().min(1).optional(),
});

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  
  const { id } = await params;const auth = await requirePlatformRole(["PlatformAdmin", "Marketing", "CustomerSuccess", "Support"]);
  if (!auth.authorized) return auth.response;

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: id },
      include: {
        template: true,
        recipients: { take: 100 }, // take initial batch for preview
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch campaign details", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  
  const { id } = await params;const auth = await requirePlatformRole(["PlatformAdmin", "Marketing"]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const parsed = UpdateCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (campaign.status !== "DRAFT" && campaign.status !== "READY_FOR_REVIEW") {
      return NextResponse.json(
        { error: "Cannot modify campaigns that are already processing or completed", code: "INVALID_STATE" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updateData: any = {};
    if (data.name) {
      updateData.name = data.name;
      updateData.utmCampaign = data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    }
    if (data.subject) updateData.subject = data.subject;
    if (data.previewText !== undefined) updateData.previewText = data.previewText || null;
    if (data.goal) updateData.goal = data.goal;
    if (data.templateId !== undefined) updateData.templateId = data.templateId || null;
    if (data.htmlBody) updateData.htmlBody = data.htmlBody;
    if (data.textBody !== undefined) updateData.textBody = data.textBody || null;
    if (data.segment) {
      updateData.audienceFilter = { segment: data.segment };
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: id },
      data: updateData,
    });

    return NextResponse.json({ campaign: updatedCampaign });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update campaign", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  
  const { id } = await params;const auth = await requirePlatformRole(["PlatformAdmin", "Marketing"]);
  if (!auth.authorized) return auth.response;

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (campaign.status !== "DRAFT" && campaign.status !== "READY_FOR_REVIEW") {
      return NextResponse.json(
        { error: "Cannot delete campaigns that are already processing or completed", code: "INVALID_STATE" },
        { status: 400 }
      );
    }

    await prisma.campaign.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Campaign deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete campaign", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
