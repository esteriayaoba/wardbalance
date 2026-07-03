import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SessionSchema = z.object({
  name: z.string().min(1, "Session name is required").max(50),
  isActive: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const sessions = await prisma.academicSession.findMany({
      where: { schoolId: guard.session.schoolId },
      orderBy: { name: "desc" },
    });

    return NextResponse.json({ data: sessions });
  } catch (err) {
    logError("[academic] Sessions GET error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = SessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { name, isActive } = parsed.data;

    const newSession = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.academicSession.updateMany({
          where: { schoolId: guard.session.schoolId, isActive: true },
          data: { isActive: false },
        });
      }

      const created = await tx.academicSession.create({
        data: {
          schoolId: guard.session.schoolId,
          name,
          isActive,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName,
          action: "ACADEMIC_SESSION_CREATED",
          entityType: "AcademicSession",
          entityId: created.id,
          newValue: JSON.parse(JSON.stringify(created)),
        },
      });

      return created;
    });

    return NextResponse.json({
      data: newSession,
      message: "Academic session created successfully.",
    });
  } catch (err: any) {
    logError("[academic] Sessions POST error:", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "This academic session already exists.", code: "CONFLICT" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
