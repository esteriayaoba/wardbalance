import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ProfileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone: z.string().min(10, "Phone number must be valid"),
  address: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "Parent") {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const parentId = session.userId;
    const schoolId = session.schoolId;

    const parent = await prisma.parent.findUnique({
      where: { id: parentId, schoolId },
      include: {
        school: {
          select: { name: true },
        },
      },
    });

    if (!parent) {
      return NextResponse.json(
        { error: "Parent profile not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: parent.id,
        firstName: parent.firstName,
        lastName: parent.lastName,
        email: parent.email,
        phone: parent.phone,
        address: parent.address,
        schoolName: parent.school.name,
      },
    });
  } catch (err: any) {
    console.error("[portal/profile] GET error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "Parent") {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const parentId = session.userId;
    const schoolId = session.schoolId;

    const body = await request.json();
    const parsed = ProfileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid profile parameters", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updated = await tx.parent.update({
        where: { id: parentId, schoolId },
        data: parsed.data,
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorId: parentId,
          actorName: `${updated.firstName} ${updated.lastName}`,
          action: "parent.profile_updated",
          entityType: "Parent",
          entityId: parentId,
          newValue: parsed.data,
        },
      });

      return updated;
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
      },
    });
  } catch (err: any) {
    console.error("[portal/profile] PATCH error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
