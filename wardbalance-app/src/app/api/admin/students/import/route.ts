import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { StudentImportSchema } from "@/schemas/student.schema";

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = StudentImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const students = parsed.data;
    const errors: { row: number; reason: string }[] = [];
    const validStudents: typeof students = [];

    // CSV self-duplicate detection
    const seenAdmissionNumbers = new Set<string>();

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const rowNum = i + 1;

      if (seenAdmissionNumbers.has(s.admissionNumber)) {
        errors.push({ row: rowNum, reason: `Duplicate admission number "${s.admissionNumber}" in import data.` });
        continue;
      }
      seenAdmissionNumbers.add(s.admissionNumber);

      const classLevel = await prisma.classLevel.findFirst({
        where: { schoolId: guard.session.schoolId, name: s.classLevelName },
      });
      if (!classLevel) {
        errors.push({ row: rowNum, reason: `Class level "${s.classLevelName}" not found.` });
        continue;
      }

      const classArm = await prisma.classArm.findFirst({
        where: { schoolId: guard.session.schoolId, classLevelId: classLevel.id, name: s.classArmName },
      });
      if (!classArm) {
        errors.push({ row: rowNum, reason: `Class arm "${s.classArmName}" not found under "${s.classLevelName}".` });
        continue;
      }

      const dbDup = await prisma.student.findFirst({
        where: { schoolId: guard.session.schoolId, admissionNumber: s.admissionNumber },
      });
      if (dbDup) {
        errors.push({ row: rowNum, reason: `Duplicate admission number "${s.admissionNumber}" already exists.` });
        continue;
      }

      validStudents.push({ ...s, classLevelName: classLevel.id, classArmName: classArm.id });
    }

    let imported = 0;
    if (validStudents.length > 0) {
      const [result] = await prisma.$transaction(async (tx) => {
        const created = await tx.student.createMany({
          data: validStudents.map((s) => ({
            schoolId: guard.session.schoolId,
            firstName: s.firstName,
            lastName: s.lastName,
            admissionNumber: s.admissionNumber,
            classLevelId: s.classLevelName,
            classArmId: s.classArmName,
            gender: s.gender ?? null,
            dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth) : null,
          })),
        });

        await tx.auditLog.create({
          data: {
            schoolId: guard.session.schoolId,
            actorId: guard.session.userId,
            actorName: guard.session.fullName ?? "Admin",
            action: "STUDENT_BULK_IMPORTED",
            entityType: "Student",
            entityId: "bulk",
            newValue: { imported: created.count, total: students.length },
          },
        });

        return [created];
      });
      imported = result.count;
    }

    return NextResponse.json({
      data: { imported, skipped: errors.length, total: students.length },
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length > 0
        ? `${imported} students imported. ${errors.length} records skipped.`
        : `${imported} students imported successfully.`,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to import students", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
