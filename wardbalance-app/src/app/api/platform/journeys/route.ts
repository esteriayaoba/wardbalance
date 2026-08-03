import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const auth = await requirePlatformRole(["PlatformAdmin", "Marketing", "CustomerSuccess"]);
  if (!auth.authorized) return auth.response;

  try {
    const journeys = await prisma.journey.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    // Add active enrollments count
    const list = await Promise.all(
      journeys.map(async (j) => {
        const activeCount = await prisma.journeyEnrollment.count({
          where: { journeyId: j.id, status: "ACTIVE" },
        });
        return {
          ...j,
          activeEnrollmentsCount: activeCount,
          totalEnrollmentsCount: j._count.enrollments,
        };
      })
    );

    return NextResponse.json({ journeys: list });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch journeys", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformRole(["PlatformAdmin", "Marketing"]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { name, description, trigger, steps } = body as {
      name: string;
      description?: string;
      trigger: string;
      steps: Array<{
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

    if (!name || !trigger || !steps || steps.length === 0) {
      return NextResponse.json(
        { error: "name, trigger, and at least one step are required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const journey = await prisma.journey.create({
      data: {
        name,
        description: description || null,
        trigger,
        isActive: false,
        createdById: auth.user.id,
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
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
      },
    });

    return NextResponse.json({ journey }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create journey", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
