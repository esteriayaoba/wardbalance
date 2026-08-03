import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requirePlatformRole(["PlatformAdmin", "Marketing", "CustomerSuccess"]);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;

    const enrollments = await prisma.journeyEnrollment.findMany({
      where: {
        journeyId: params.id,
        status: status ? status : undefined,
      },
      include: {
        school: { select: { name: true, phone: true } },
        lead: { select: { fullName: true, schoolName: true, phone: true } },
      },
      orderBy: { enrolledAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ enrollments });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch enrollments", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
