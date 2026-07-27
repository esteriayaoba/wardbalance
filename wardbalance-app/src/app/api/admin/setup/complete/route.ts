import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";


export async function POST(_request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner"]);
    if (!guard.authorized) return guard.response;

    const schoolId = guard.session.schoolId;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return NextResponse.json(
        { error: "School not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (school.status !== "onboarding") {
      return NextResponse.json({
        data: { status: school.status, message: "Setup is already complete." },
      });
    }

    const [sessionCount, termCount, divisionCount, levelCount, armCount, studentCount, parentCount, linkCount, feeItemCount, templateCount, invoiceCount] = await Promise.all([
      prisma.academicSession.count({ where: { schoolId } }),
      prisma.academicTerm.count({ where: { schoolId } }),
      prisma.division.count({ where: { schoolId } }),
      prisma.classLevel.count({ where: { schoolId } }),
      prisma.classArm.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId } }),
      prisma.parent.count({ where: { schoolId } }),
      prisma.parentWardLink.count({ where: { schoolId } }),
      prisma.feeItem.count({ where: { schoolId } }),
      prisma.classFeeTemplate.count({ where: { schoolId } }),
      prisma.invoice.count({ where: { schoolId } }),
    ]);

    const isProfileComplete = !!(school.address && school.phone);
    const completed =
      (isProfileComplete ? 1 : 0) +
      (sessionCount > 0 ? 1 : 0) +
      (termCount > 0 ? 1 : 0) +
      (divisionCount > 0 ? 1 : 0) +
      (levelCount > 0 ? 1 : 0) +
      (armCount > 0 ? 1 : 0) +
      (studentCount > 0 ? 1 : 0) +
      (parentCount > 0 ? 1 : 0) +
      (linkCount > 0 ? 1 : 0) +
      (feeItemCount > 0 ? 1 : 0) +
      (templateCount > 0 ? 1 : 0) +
      (invoiceCount > 0 ? 1 : 0);

    if (completed < 12) {
      return NextResponse.json(
        { error: "Setup is not yet complete", code: "SETUP_INCOMPLETE" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.school.update({
        where: { id: schoolId },
        data: { status: "active" },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName || "System",
          action: "school.setup_completed",
          entityType: "School",
          entityId: schoolId,
          newValue: { status: "active" },
        },
      });

      await tx.lifecycleEvent.create({
        data: {
          schoolId,
          userId: guard.session.userId,
          milestone: "setup_completed",
          metadata: {},
        },
      });

      await tx.lifecycleEvent.create({
        data: {
          schoolId,
          userId: guard.session.userId,
          milestone: "school_active",
          metadata: {},
        },
      });
    });

    return NextResponse.json({
      data: { status: "active", message: "School setup complete. Dashboard is now active." },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("[setup/complete] POST error:", err);
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
