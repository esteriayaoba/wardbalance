import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  
  const { id } = await params;const auth = await requirePlatformRole(["PlatformAdmin", "Marketing", "CustomerSuccess"]);
  if (!auth.authorized) return auth.response;

  try {
    const journey = await prisma.journey.findUnique({
      where: { id: id },
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
        _count: { select: { enrollments: true } },
      },
    });

    if (!journey) {
      return NextResponse.json({ error: "Journey not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const activeEnrollmentsCount = await prisma.journeyEnrollment.count({
      where: { journeyId: id, status: "ACTIVE" },
    });

    return NextResponse.json({
      journey: {
        ...journey,
        activeEnrollmentsCount,
        totalEnrollmentsCount: journey._count.enrollments,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch journey details", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  
  const { id } = await params;const auth = await requirePlatformRole(["PlatformAdmin", "Marketing"]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { name, description, trigger, steps } = body as {
      name: string;
      description?: string;
      trigger: string;
      steps: Array<{
        id?: string;
        stepOrder: number;
        delayDays: number;
        channel: "EMAIL" | "SMS";
        subject?: string;
        htmlBody?: string;
        textBody?: string;
        smsBody?: string;
        templateId?: string;
      }>;
    };

    const existing = await prisma.journey.findUnique({ where: { id: id } });
    if (!existing) {
      return NextResponse.json({ error: "Journey not found", code: "NOT_FOUND" }, { status: 404 });
    }

    // Replace steps transactionally
    await prisma.$transaction([
      prisma.journeyStep.deleteMany({ where: { journeyId: id } }),
      prisma.journey.update({
        where: { id: id },
        data: {
          name,
          description: description || null,
          trigger,
          steps: {
            create: steps.map((s, idx) => ({
              stepOrder: s.stepOrder || idx + 1,
              delayDays: s.delayDays || 0,
              channel: s.channel || "EMAIL",
              subject: s.subject || null,
              htmlBody: s.htmlBody || null,
              textBody: s.textBody || null,
              smsBody: s.smsBody || null,
              templateId: s.templateId || null,
            })),
          },
        },
      }),
    ]);

    const updated = await prisma.journey.findUnique({
      where: { id: id },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });

    return NextResponse.json({ journey: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update journey", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
