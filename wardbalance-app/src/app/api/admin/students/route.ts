import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { CreateStudentSchema } from "@/modules/academic/schemas";
import { parsePagination, paginatedJsonResponse } from "@/lib/server/pagination";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const classLevelId = searchParams.get("classLevelId");
    const classArmId = searchParams.get("classArmId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = { schoolId: guard.session.schoolId };

    if (classLevelId) where.classLevelId = classLevelId;
    if (classArmId) where.classArmId = classArmId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { admissionNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const { limit, offset } = parsePagination(searchParams);

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          classLevel: true,
          classArm: true,
          parents: {
            include: { parent: true },
          },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: limit,
        skip: offset,
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json(paginatedJsonResponse(students, total, limit, offset));
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch students", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = CreateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.student.findFirst({
      where: { schoolId: guard.session.schoolId, admissionNumber: data.admissionNumber },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A student with this admission number already exists.", code: "DUPLICATE" },
        { status: 409 }
      );
    }

    const [student] = await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          schoolId: guard.session.schoolId,
          firstName: data.firstName,
          lastName: data.lastName,
          admissionNumber: data.admissionNumber,
          classLevelId: data.classLevelId,
          classArmId: data.classArmId,
          gender: data.gender ?? null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          status: data.status,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName ?? "Admin",
          action: "STUDENT_REGISTERED",
          entityType: "Student",
          entityId: student.id,
          newValue: JSON.parse(JSON.stringify(student)),
        },
      });

      return [student];
    });

    return NextResponse.json({ data: student }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create student", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
