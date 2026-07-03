import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateParentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ parentId: string }> }
) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { parentId } = await params;

    const parent = await prisma.parent.findFirst({
      where: { id: parentId, schoolId: guard.session.schoolId },
      include: {
        wards: {
          include: {
            student: {
              include: {
                classLevel: true,
                classArm: true,
              },
            },
          },
        },
      },
    });

    if (!parent) {
      return NextResponse.json({ error: "Parent not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ data: parent });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch parent", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ parentId: string }> }
) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { parentId } = await params;

    const existing = await prisma.parent.findFirst({
      where: { id: parentId, schoolId: guard.session.schoolId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Parent not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = UpdateParentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const data = parsed.data;
    const allowedFields: Record<string, unknown> = {};
    if (data.firstName !== undefined) allowedFields.firstName = data.firstName;
    if (data.lastName !== undefined) allowedFields.lastName = data.lastName;
    if (data.phone !== undefined) allowedFields.phone = data.phone;
    if (data.email !== undefined) allowedFields.email = data.email || null;
    if (data.address !== undefined) allowedFields.address = data.address || null;

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: "No valid fields provided", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const [updated] = await prisma.$transaction(async (tx) => {
      const updated = await tx.parent.update({
        where: { id: parentId },
        data: allowedFields,
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName ?? "Admin",
          action: "PARENT_UPDATED",
          entityType: "Parent",
          entityId: parentId,
          previousValue: JSON.parse(JSON.stringify(existing)),
          newValue: JSON.parse(JSON.stringify(updated)),
        },
      });

      return [updated];
    });

    return NextResponse.json({ data: updated, message: "Parent updated successfully." });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update parent", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ parentId: string }> }
) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { parentId } = await params;

    const existing = await prisma.parent.findFirst({
      where: { id: parentId, schoolId: guard.session.schoolId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Parent not found", code: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.parent.delete({ where: { id: parentId } });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName ?? "Admin",
          action: "PARENT_DELETED",
          entityType: "Parent",
          entityId: parentId,
          previousValue: JSON.parse(JSON.stringify(existing)),
        },
      });
    });

    return NextResponse.json({ message: "Parent deleted successfully." });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete parent", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
