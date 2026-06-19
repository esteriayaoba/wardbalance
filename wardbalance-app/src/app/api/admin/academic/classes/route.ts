import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateClassSchema = z.object({
  type: z.enum(["division", "level", "arm"]),
  name: z.string().min(1, "Name is required").max(100),
  divisionId: z.string().optional(), // required for level
  classLevelId: z.string().optional(), // required for arm
});

const DeleteClassSchema = z.object({
  type: z.enum(["division", "level", "arm"]),
  id: z.string().min(1, "ID is required"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const divisions = await prisma.division.findMany({
      where: { schoolId: session.schoolId },
      include: {
        classLevels: {
          include: {
            classArms: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: divisions });
  } catch (err) {
    console.error("[academic] Classes GET error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = CreateClassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { type, name, divisionId, classLevelId } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      let createdEntity: any;

      if (type === "division") {
        createdEntity = await tx.division.create({
          data: {
            schoolId: session.schoolId,
            name,
          },
        });
      } else if (type === "level") {
        if (!divisionId) throw new Error("Division ID is required for Class Level");
        createdEntity = await tx.classLevel.create({
          data: {
            schoolId: session.schoolId,
            divisionId,
            name,
          },
        });
      } else if (type === "arm") {
        if (!classLevelId) throw new Error("Class Level ID is required for Class Arm");
        createdEntity = await tx.classArm.create({
          data: {
            schoolId: session.schoolId,
            classLevelId,
            name,
          },
        });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: `ACADEMIC_${type.toUpperCase()}_CREATED`,
          entityType: type === "division" ? "Division" : type === "level" ? "ClassLevel" : "ClassArm",
          entityId: createdEntity.id,
          newValue: JSON.parse(JSON.stringify(createdEntity)),
        },
      });

      return createdEntity;
    });

    return NextResponse.json({
      data: result,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully.`,
    });
  } catch (err: any) {
    console.error("[academic] Classes POST error:", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "This item already exists.", code: "CONFLICT" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawType = searchParams.get("type") ?? "";
    const rawId = searchParams.get("id") ?? "";

    const parsed = DeleteClassSchema.safeParse({ type: rawType, id: rawId });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { type, id } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      let deletedEntity: any;

      if (type === "division") {
        deletedEntity = await tx.division.findFirst({ where: { id, schoolId: session.schoolId } });
        if (!deletedEntity) throw new Error("Division not found");
        await tx.division.delete({ where: { id } });
      } else if (type === "level") {
        deletedEntity = await tx.classLevel.findFirst({ where: { id, schoolId: session.schoolId } });
        if (!deletedEntity) throw new Error("Class Level not found");
        await tx.classLevel.delete({ where: { id } });
      } else if (type === "arm") {
        deletedEntity = await tx.classArm.findFirst({ where: { id, schoolId: session.schoolId } });
        if (!deletedEntity) throw new Error("Class Arm not found");
        await tx.classArm.delete({ where: { id } });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: `ACADEMIC_${type.toUpperCase()}_DELETED`,
          entityType: type === "division" ? "Division" : type === "level" ? "ClassLevel" : "ClassArm",
          entityId: id,
          previousValue: JSON.parse(JSON.stringify(deletedEntity)),
        },
      });

      return deletedEntity;
    });

    return NextResponse.json({
      data: result,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`,
    });
  } catch (err: any) {
    console.error("[academic] Classes DELETE error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to delete academic element", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
