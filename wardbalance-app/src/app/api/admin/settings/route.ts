import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SettingsSchema = z.object({
  name: z.string().min(1, "School name is required").max(160),
  address: z.string().min(1, "School address is required").max(500),
  phone: z.string().min(1, "School contact phone is required").max(30),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  estimatedStudents: z.string().optional().or(z.literal("")),
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

    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
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
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = SettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid inputs", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Fetch previous value for audit log
    const prevSchool = await prisma.school.findUnique({
      where: { id: session.schoolId },
    });

    const updatedSchool = await prisma.school.update({
      where: { id: session.schoolId },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email || null,
        estimatedStudents: data.estimatedStudents || null,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        schoolId: session.schoolId,
        actorId: session.userId,
        actorName: session.fullName,
        action: "SCHOOL_PROFILE_UPDATED",
        entityType: "School",
        entityId: session.schoolId,
        previousValue: prevSchool ? JSON.parse(JSON.stringify(prevSchool)) : null,
        newValue: JSON.parse(JSON.stringify(updatedSchool)),
      },
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
