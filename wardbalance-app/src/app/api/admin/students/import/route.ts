import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

interface StudentImportRow {
  firstName?: string;
  lastName?: string;
  admissionNumber?: string;
  classLevelName?: string;
  classArmName?: string;
  gender?: string;
  dateOfBirth?: string;
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

    const { students } = await request.json();

    if (!Array.isArray(students)) {
      return NextResponse.json(
        { error: "Students array is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const schoolId = session.schoolId;

    // Fetch existing students, levels, and arms for quick validation mapping
    const [existingStudents, classArms] = await Promise.all([
      prisma.student.findMany({
        where: { schoolId },
        select: { admissionNumber: true },
      }),
      prisma.classArm.findMany({
        where: { schoolId },
        include: {
          classLevel: true,
        },
      }),
    ]);

    const existingAdmissionNumbers = new Set(existingStudents.map((s) => s.admissionNumber.toLowerCase()));
    
    // Helper to find arm and level ID
    const findClassArm = (levelName: string, armName: string) => {
      return classArms.find(
        (a) =>
          a.classLevel.name.toLowerCase().trim() === levelName.toLowerCase().trim() &&
          a.name.toLowerCase().trim() === armName.toLowerCase().trim()
      );
    };

    const importedStudents: any[] = [];
    const skippedRecords: { row: number; reason: string }[] = [];

    // Temporary set to check duplicates within the CSV itself
    const csvAdmissionNumbers = new Set<string>();

    for (let i = 0; i < students.length; i++) {
      const rowNum = i + 1;
      const row = students[i] as StudentImportRow;

      const firstName = row.firstName?.trim();
      const lastName = row.lastName?.trim();
      const admissionNumber = row.admissionNumber?.trim();
      const classLevelName = row.classLevelName?.trim();
      const classArmName = row.classArmName?.trim();

      if (!firstName || !lastName || !admissionNumber || !classLevelName || !classArmName) {
        skippedRecords.push({
          row: rowNum,
          reason: "Missing required fields (First Name, Last Name, Admission Number, Class Level, or Class Arm).",
        });
        continue;
      }

      const lowerAdm = admissionNumber.toLowerCase();

      // Check CSV self-duplicates
      if (csvAdmissionNumbers.has(lowerAdm)) {
        skippedRecords.push({
          row: rowNum,
          reason: `Duplicate admission number "${admissionNumber}" found within the CSV file.`,
        });
        continue;
      }
      csvAdmissionNumbers.add(lowerAdm);

      // Check DB duplicates
      if (existingAdmissionNumbers.has(lowerAdm)) {
        skippedRecords.push({
          row: rowNum,
          reason: `Admission number "${admissionNumber}" is already registered in the school database.`,
        });
        continue;
      }

      // Check if Class Level & Arm exists
      const arm = findClassArm(classLevelName, classArmName);
      if (!arm) {
        skippedRecords.push({
          row: rowNum,
          reason: `Class Level/Arm combination "${classLevelName} - ${classArmName}" does not exist. Please create it first.`,
        });
        continue;
      }

      // Parse date of birth if valid
      let dob: Date | null = null;
      if (row.dateOfBirth) {
        const parsedDate = Date.parse(row.dateOfBirth);
        if (!isNaN(parsedDate)) {
          dob = new Date(parsedDate);
        }
      }

      importedStudents.push({
        schoolId,
        firstName,
        lastName,
        admissionNumber,
        classLevelId: arm.classLevelId,
        classArmId: arm.id,
        gender: row.gender?.trim() || null,
        dateOfBirth: dob,
        status: "active",
      });
    }

    // Execute batch writes in a transaction
    if (importedStudents.length > 0) {
      await prisma.$transaction(async (tx) => {
        // Create in chunks or batch create
        await tx.student.createMany({
          data: importedStudents,
        });

        // Write AuditLog
        await tx.auditLog.create({
          data: {
            schoolId,
            actorId: session.userId,
            actorName: session.fullName,
            action: "STUDENT_BULK_IMPORTED",
            entityType: "Student",
            entityId: "bulk",
            newValue: {
              importedCount: importedStudents.length,
              skippedCount: skippedRecords.length,
            },
          },
        });
      });
    }

    return NextResponse.json({
      data: {
        imported: importedStudents.length,
        skipped: skippedRecords.length,
        skippedDetails: skippedRecords,
      },
      message: "CSV Student import completed.",
    });
  } catch (err) {
    console.error("[students] Import error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during CSV parsing", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
