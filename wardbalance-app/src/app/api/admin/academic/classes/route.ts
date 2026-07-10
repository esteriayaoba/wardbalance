import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { CreateClassSchema, DeleteClassSchema } from "@/modules/academic/schemas";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const divisions = await prisma.division.findMany({
      where: { schoolId: guard.session.schoolId },
      include: {
        classLevels: {
          include: { classArms: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: { divisions } });
  } catch (err) {
    console.error("[academic] Classes GET error:", err);
    return NextResponse.json({ error: "Failed to fetch classes", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = CreateClassSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { type, name, divisionId, classLevelId } = parsed.data;

    let entityName = "";
    let entityId = "";

    const [result] = await prisma.$transaction(async (tx) => {
      if (type === "division") {
        const created = await tx.division.create({ data: { schoolId: guard.session.schoolId, name } });
        entityName = "Division";
        entityId = created.id;
        await tx.auditLog.create({
          data: {
            schoolId: guard.session.schoolId, actorId: guard.session.userId, actorName: guard.session.fullName,
            action: "DIVISION_CREATED", entityType: "Division", entityId: created.id,
            newValue: JSON.parse(JSON.stringify(created)),
          },
        });
        return [created];
      } else if (type === "level") {
        if (!divisionId) return [NextResponse.json({ error: "Division ID is required for class level", code: "VALIDATION_ERROR" }, { status: 400 })];
        const created = await tx.classLevel.create({ data: { schoolId: guard.session.schoolId, divisionId, name } });
        entityName = "ClassLevel";
        entityId = created.id;
        await tx.auditLog.create({
          data: {
            schoolId: guard.session.schoolId, actorId: guard.session.userId, actorName: guard.session.fullName,
            action: "CLASS_LEVEL_CREATED", entityType: "ClassLevel", entityId: created.id,
            newValue: JSON.parse(JSON.stringify(created)),
          },
        });
        return [created];
      } else if (type === "arm") {
        if (!classLevelId) return [NextResponse.json({ error: "Class level ID is required for class arm", code: "VALIDATION_ERROR" }, { status: 400 })];
        const created = await tx.classArm.create({ data: { schoolId: guard.session.schoolId, classLevelId, name } });
        entityName = "ClassArm";
        entityId = created.id;
        await tx.auditLog.create({
          data: {
            schoolId: guard.session.schoolId, actorId: guard.session.userId, actorName: guard.session.fullName,
            action: "CLASS_ARM_CREATED", entityType: "ClassArm", entityId: created.id,
            newValue: JSON.parse(JSON.stringify(created)),
          },
        });
        return [created];
      }
      return [NextResponse.json({ error: "Invalid type", code: "VALIDATION_ERROR" }, { status: 400 })];
    });

    if (result instanceof NextResponse) return result;
    return NextResponse.json({ data: result, message: `${entityName} created successfully.` }, { status: 201 });
  } catch (err: unknown) {
    logError("academic/classes POST", err);
    if ((err as Record<string, unknown>)?.code === "P2002") {
      return NextResponse.json({ error: "This record already exists.", code: "CONFLICT" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create class structure", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = DeleteClassSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { type, id } = parsed.data;

    const [deleted] = await prisma.$transaction(async (tx) => {
      if (type === "division") {
        // Check for dependent class levels
        const levels = await tx.classLevel.count({ where: { divisionId: id } });
        if (levels > 0) {
          throw new Error(`Cannot delete division: ${levels} class level(s) depend on it. Remove them first.`);
        }
        const existing = await tx.division.findFirst({ where: { id, schoolId: guard.session.schoolId } });
        if (!existing) throw new Error("Division not found.");
        await tx.division.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            schoolId: guard.session.schoolId, actorId: guard.session.userId, actorName: guard.session.fullName,
            action: "DIVISION_DELETED", entityType: "Division", entityId: id,
            previousValue: JSON.parse(JSON.stringify(existing)),
          },
        });
        return [existing];
      } else if (type === "level") {
        const arms = await tx.classArm.count({ where: { classLevelId: id } });
        if (arms > 0) {
          throw new Error(`Cannot delete class level: ${arms} class arm(s) depend on it. Remove them first.`);
        }
        const students = await tx.student.count({ where: { classLevelId: id } });
        if (students > 0) {
          throw new Error(`Cannot delete class level: ${students} student(s) are assigned to it. Reassign them first.`);
        }
        const existing = await tx.classLevel.findFirst({ where: { id, schoolId: guard.session.schoolId } });
        if (!existing) throw new Error("Class level not found.");
        await tx.classLevel.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            schoolId: guard.session.schoolId, actorId: guard.session.userId, actorName: guard.session.fullName,
            action: "CLASS_LEVEL_DELETED", entityType: "ClassLevel", entityId: id,
            previousValue: JSON.parse(JSON.stringify(existing)),
          },
        });
        return [existing];
      } else if (type === "arm") {
        const students = await tx.student.count({ where: { classArmId: id } });
        if (students > 0) {
          throw new Error(`Cannot delete class arm: ${students} student(s) are assigned to it. Reassign them first.`);
        }
        const existing = await tx.classArm.findFirst({ where: { id, schoolId: guard.session.schoolId } });
        if (!existing) throw new Error("Class arm not found.");
        await tx.classArm.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            schoolId: guard.session.schoolId, actorId: guard.session.userId, actorName: guard.session.fullName,
            action: "CLASS_ARM_DELETED", entityType: "ClassArm", entityId: id,
            previousValue: JSON.parse(JSON.stringify(existing)),
          },
        });
        return [existing];
      }
      throw new Error("Invalid type");
    });

    return NextResponse.json({ data: deleted, message: "Deleted successfully." });
  } catch (err: unknown) {
    logError("academic/classes DELETE", err);
    const e = err as Error;
    if (e.message?.startsWith("Cannot delete")) {
      return NextResponse.json({ error: e.message, code: "DEPENDENCY_ERROR" }, { status: 409 });
    }
    if (e.message?.includes("not found")) {
      return NextResponse.json({ error: e.message, code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete class structure", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
