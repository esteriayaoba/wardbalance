import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { CreateTermSchema, UpdateTermSchema } from "@/modules/academic/schemas";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const terms = await prisma.academicTerm.findMany({
      where: { schoolId: guard.session.schoolId },
      include: { session: { select: { id: true, name: true } } },
      orderBy: [{ session: { name: "desc" } }, { name: "asc" }],
    });

    return NextResponse.json({ data: terms });
  } catch (err) {
    logError("[academic] Terms GET error:", err);
    return NextResponse.json({ error: "Failed to fetch terms", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = CreateTermSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { sessionId, name, isActive, status } = parsed.data;

    // Verify session exists within this school
    const session = await prisma.academicSession.findFirst({
      where: { id: sessionId, schoolId: guard.session.schoolId },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const [term] = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.academicTerm.updateMany({
          where: { schoolId: guard.session.schoolId, isActive: true },
          data: { isActive: false },
        });
      }

      const created = await tx.academicTerm.create({
        data: { schoolId: guard.session.schoolId, sessionId, name, isActive, status },
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName,
          action: "ACADEMIC_TERM_CREATED",
          entityType: "AcademicTerm",
          entityId: created.id,
          newValue: JSON.parse(JSON.stringify(created)),
        },
      });

      return [created];
    });

    return NextResponse.json({ data: term, message: "Academic term created successfully." }, { status: 201 });
  } catch (err: any) {
    logError("[academic] Terms POST error:", err);
    if (err.code === "P2002") {
      return NextResponse.json({ error: "This term already exists in this session.", code: "CONFLICT" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create term", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = UpdateTermSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { id, isActive, status } = parsed.data;

    const existing = await prisma.academicTerm.findFirst({
      where: { id, schoolId: guard.session.schoolId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Term not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const [updated] = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.academicTerm.updateMany({
          where: { schoolId: guard.session.schoolId, isActive: true },
          data: { isActive: false },
        });
      }

      const updated = await tx.academicTerm.update({
        where: { id },
        data: {
          ...(isActive !== undefined && { isActive }),
          ...(status !== undefined && { status }),
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName,
          action: "ACADEMIC_TERM_UPDATED",
          entityType: "AcademicTerm",
          entityId: id,
          previousValue: JSON.parse(JSON.stringify(existing)),
          newValue: JSON.parse(JSON.stringify(updated)),
        },
      });

      return [updated];
    });

    return NextResponse.json({ data: updated, message: "Term updated successfully." });
  } catch (err) {
    logError("[academic] Terms PATCH error:", err);
    return NextResponse.json({ error: "Failed to update term", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
