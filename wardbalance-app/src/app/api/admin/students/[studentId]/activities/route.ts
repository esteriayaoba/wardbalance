import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const session = await getSession();
    if (!session || !["SchoolOwner", "Bursar", "Principal", "Admin"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Get all optional fee items
    const optionalFees = await prisma.feeItem.findMany({
      where: { schoolId: session.schoolId, type: "optional" },
      orderBy: { name: "asc" },
    });

    // Get current enrolments
    const enrolments = await prisma.studentActivityEnrolment.findMany({
      where: {
        schoolId: session.schoolId,
        studentId: studentId,
        sessionId: sessionId,
      },
    });

    const enrolledItemIds = enrolments.map((e) => e.feeItemId);

    const data = optionalFees.map((fee) => ({
      ...fee,
      isEnrolled: enrolledItemIds.includes(fee.id),
      enrolmentId: enrolments.find((e) => e.feeItemId === fee.id)?.id || null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}

const ToggleActivitySchema = z.object({
  feeItemId: z.string(),
  sessionId: z.string(),
  action: z.enum(["enrol", "remove"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const session = await getSession();
    if (!session || !["SchoolOwner", "Bursar", "Principal"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ToggleActivitySchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { feeItemId, sessionId, action } = parsed.data;

    // Verify student exists and belongs to school
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: session.schoolId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (action === "enrol") {
      await prisma.studentActivityEnrolment.upsert({
        where: {
          studentId_feeItemId_sessionId: {
            studentId: studentId,
            feeItemId,
            sessionId,
          },
        },
        update: {},
        create: {
          schoolId: session.schoolId,
          studentId: studentId,
          feeItemId,
          sessionId,
        },
      });

      await prisma.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName || "Admin",
          action: "ACTIVITY_ENROLLED",
          entityType: "Student",
          entityId: studentId,
          newValue: { feeItemId, sessionId },
        }
      });
    } else {
      await prisma.studentActivityEnrolment.deleteMany({
        where: {
          schoolId: session.schoolId,
          studentId: studentId,
          feeItemId,
          sessionId,
        },
      });

      await prisma.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName || "Admin",
          action: "ACTIVITY_REMOVED",
          entityType: "Student",
          entityId: studentId,
          previousValue: { feeItemId, sessionId },
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to toggle activity enrolment" }, { status: 500 });
  }
}
