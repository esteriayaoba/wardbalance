import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SessionSchema = z.object({
  name: z.string().min(1, "Session name is required").max(50),
  isActive: z.boolean().default(false),
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

    const sessions = await prisma.academicSession.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { name: "desc" },
    });

    return NextResponse.json({ data: sessions });
  } catch (err) {
    console.error("[academic] Sessions GET error:", err);
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
    const parsed = SessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { name, isActive } = parsed.data;

    const newSession = await prisma.$transaction(async (tx) => {
      // If setting as active, mark other sessions inactive
      if (isActive) {
        await tx.academicSession.updateMany({
          where: { schoolId: session.schoolId, isActive: true },
          data: { isActive: false },
        });
      }

      const created = await tx.academicSession.create({
        data: {
          schoolId: session.schoolId,
          name,
          isActive,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
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
    console.error("[academic] Sessions POST error:", err);
    // Handle unique constraint e.g. same session name
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
