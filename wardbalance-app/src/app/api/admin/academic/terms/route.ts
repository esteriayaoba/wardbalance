import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateTermSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  name: z.string().min(1, "Term name is required").max(50),
  isActive: z.boolean().default(false),
  status: z.enum(["active", "locked"]).default("active"),
});

const UpdateTermSchema = z.object({
  id: z.string().min(1, "Term ID is required"),
  isActive: z.boolean().optional(),
  status: z.enum(["active", "locked"]).optional(),
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

    const terms = await prisma.academicTerm.findMany({
      where: { schoolId: session.schoolId },
      include: {
        session: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: terms });
  } catch (err) {
    console.error("[academic] Terms GET error:", err);
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
    const parsed = CreateTermSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { sessionId, name, isActive, status } = parsed.data;

    const newTerm = await prisma.$transaction(async (tx) => {
      // If setting as active, mark other terms inactive for this school
      if (isActive) {
        await tx.academicTerm.updateMany({
          where: { schoolId: session.schoolId, isActive: true },
          data: { isActive: false },
        });
      }

      const created = await tx.academicTerm.create({
        data: {
          schoolId: session.schoolId,
          sessionId,
          name,
          isActive,
          status,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: "ACADEMIC_TERM_CREATED",
          entityType: "AcademicTerm",
          entityId: created.id,
          newValue: JSON.parse(JSON.stringify(created)),
        },
      });

      return created;
    });

    return NextResponse.json({
      data: newTerm,
      message: "Academic term created successfully.",
    });
  } catch (err: any) {
    console.error("[academic] Terms POST error:", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "This term name already exists under the selected session.", code: "CONFLICT" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = UpdateTermSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { id, isActive, status } = parsed.data;

    const updatedTerm = await prisma.$transaction(async (tx) => {
      // Verify ownership
      const existing = await tx.academicTerm.findFirst({
        where: { id, schoolId: session.schoolId },
      });

      if (!existing) {
        throw new Error("Term not found or unauthorized");
      }

      // If updating isActive to true, deactivate all other terms
      if (isActive) {
        await tx.academicTerm.updateMany({
          where: { schoolId: session.schoolId, isActive: true },
          data: { isActive: false },
        });
      }

      const updated = await tx.academicTerm.update({
        where: { id },
        data: {
          ...(isActive !== undefined ? { isActive } : {}),
          ...(status !== undefined ? { status } : {}),
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: "ACADEMIC_TERM_UPDATED",
          entityType: "AcademicTerm",
          entityId: updated.id,
          previousValue: JSON.parse(JSON.stringify(existing)),
          newValue: JSON.parse(JSON.stringify(updated)),
        },
      });

      return updated;
    });

    return NextResponse.json({
      data: updatedTerm,
      message: "Academic term updated successfully.",
    });
  } catch (err: any) {
    console.error("[academic] Terms PATCH error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to update academic term", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
