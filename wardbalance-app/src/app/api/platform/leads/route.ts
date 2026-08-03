import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { LeadStatus } from "@/generated/prisma";

export async function GET() {
  const auth = await requirePlatformRole(["PlatformAdmin", "Marketing", "CustomerSuccess", "Support"]);
  if (!auth.authorized) return auth.response;

  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      include: { school: true },
    });

    return NextResponse.json({ leads });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch leads", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePlatformRole(["PlatformAdmin", "Marketing", "CustomerSuccess", "Support"]);
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { id, status, schoolId } = body;

    if (!id) {
      return NextResponse.json({ error: "Lead ID is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status as LeadStatus;
    }
    if (schoolId !== undefined) {
      updateData.schoolId = schoolId || null;
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ lead });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update lead", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
