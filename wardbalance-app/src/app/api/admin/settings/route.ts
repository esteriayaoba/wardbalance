import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SettingsSchema = z.object({
  name: z.string().min(1, "School name is required").max(160),
  address: z.string().min(1, "School address is required").max(500),
  phone: z.string().min(1, "School contact phone is required").max(30),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  estimatedStudents: z.string().optional().or(z.literal("")),
  bankName: z.string().max(100).optional().or(z.literal("")),
  bankAccountNumber: z.string().max(30).optional().or(z.literal("")),
  bankAccountName: z.string().max(150).optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const school = await prisma.school.findUnique({
      where: { id: guard.session.schoolId },
    });

    return NextResponse.json({ data: school });
  } catch (err) {
    console.error("[settings] GET error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = SettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid inputs", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [updatedSchool] = await prisma.$transaction(async (tx) => {
      const prevSchool = await tx.school.findUnique({
        where: { id: guard.session.schoolId },
      });

      const updated = await tx.school.update({
        where: { id: guard.session.schoolId },
        data: {
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email || null,
          estimatedStudents: data.estimatedStudents || null,
          bankName: data.bankName || null,
          bankAccountNumber: data.bankAccountNumber || null,
          bankAccountName: data.bankAccountName || null,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName,
          action: "SCHOOL_PROFILE_UPDATED",
          entityType: "School",
          entityId: guard.session.schoolId,
          previousValue: prevSchool ? JSON.parse(JSON.stringify(prevSchool)) : null,
          newValue: JSON.parse(JSON.stringify(updated)),
        },
      });

      return [updated];
    });

    return NextResponse.json({
      data: updatedSchool,
      message: "School profile updated successfully.",
    });
  } catch (err) {
    console.error("[settings] POST error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
