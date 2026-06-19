import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateStudentSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  admissionNumber: z.string().min(1, "Admission number is required").max(50),
  classLevelId: z.string().min(1, "Class level is required"),
  classArmId: z.string().min(1, "Class arm is required"),
  gender: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
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

    const students = await prisma.student.findMany({
      where: { schoolId: session.schoolId },
      include: {
        classLevel: { select: { name: true } },
        classArm: { select: { name: true } },
        parents: {
          include: {
            parent: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: [{ classLevel: { name: "asc" } }, { lastName: "asc" }],
    });

    return NextResponse.json({ data: students });
  } catch (err) {
    console.error("[students] GET error:", err);
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
    const parsed = CreateStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check unique admissionNumber inside the school
    const existing = await prisma.student.findFirst({
      where: {
        schoolId: session.schoolId,
        admissionNumber: data.admissionNumber.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Duplicate admission number found in this school.", code: "CONFLICT" },
        { status: 409 }
      );
    }

    const newStudent = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: {
          schoolId: session.schoolId,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          admissionNumber: data.admissionNumber.trim(),
          classLevelId: data.classLevelId,
          classArmId: data.classArmId,
          gender: data.gender || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          status: data.status,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: "STUDENT_REGISTERED",
          entityType: "Student",
          entityId: created.id,
          newValue: JSON.parse(JSON.stringify(created)),
        },
      });

      return created;
    });

    return NextResponse.json({
      data: newStudent,
      message: "Student registered successfully.",
    });
  } catch (err) {
    console.error("[students] POST error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
