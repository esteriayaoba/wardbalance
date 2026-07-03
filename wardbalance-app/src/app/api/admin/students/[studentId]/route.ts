import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { studentId } = await params;

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: guard.session.schoolId },
      include: {
        classLevel: true,
        classArm: true,
        parents: {
          include: { parent: true },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ data: student });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch student", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { studentId } = await params;
    const body = await request.json();

    const existing = await prisma.student.findFirst({
      where: { id: studentId, schoolId: guard.session.schoolId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Student not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const allowedFields: Record<string, unknown> = {};
    if (body.firstName !== undefined) allowedFields.firstName = body.firstName;
    if (body.lastName !== undefined) allowedFields.lastName = body.lastName;
    if (body.gender !== undefined) allowedFields.gender = body.gender;
    if (body.dateOfBirth !== undefined) allowedFields.dateOfBirth = new Date(body.dateOfBirth);
    if (body.status !== undefined) allowedFields.status = body.status;
    if (body.classLevelId !== undefined) allowedFields.classLevelId = body.classLevelId;
    if (body.classArmId !== undefined) allowedFields.classArmId = body.classArmId;

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: "No valid fields provided", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const [updated] = await prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id: studentId },
        data: allowedFields,
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName ?? "Admin",
          action: "STUDENT_UPDATED",
          entityType: "Student",
          entityId: studentId,
          previousValue: JSON.parse(JSON.stringify(existing)),
          newValue: JSON.parse(JSON.stringify(updated)),
        },
      });

      return [updated];
    });

    return NextResponse.json({ data: updated, message: "Student updated successfully." });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update student", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { studentId } = await params;

    const existing = await prisma.student.findFirst({
      where: { id: studentId, schoolId: guard.session.schoolId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Student not found", code: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.student.delete({ where: { id: studentId } });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName ?? "Admin",
          action: "STUDENT_DELETED",
          entityType: "Student",
          entityId: studentId,
          previousValue: JSON.parse(JSON.stringify(existing)),
        },
      });
    });

    return NextResponse.json({ message: "Student deleted successfully." });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete student", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
