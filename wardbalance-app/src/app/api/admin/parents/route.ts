import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateParentSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  phone: z.string().min(1, "Phone number is required").max(30),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
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

    const parents = await prisma.parent.findMany({
      where: { schoolId: session.schoolId },
      include: {
        wards: {
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                admissionNumber: true,
              },
            },
          },
        },
      },
      orderBy: { lastName: "asc" },
    });

    return NextResponse.json({ data: parents });
  } catch (err) {
    console.error("[parents] GET error:", err);
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
    const parsed = CreateParentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check unique phone number in this school
    const existing = await prisma.parent.findFirst({
      where: {
        schoolId: session.schoolId,
        phone: data.phone.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A parent with this phone number is already registered.", code: "CONFLICT" },
        { status: 409 }
      );
    }

    const newParent = await prisma.$transaction(async (tx) => {
      const created = await tx.parent.create({
        data: {
          schoolId: session.schoolId,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone.trim(),
          email: data.email || null,
          address: data.address || null,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: "PARENT_REGISTERED",
          entityType: "Parent",
          entityId: created.id,
          newValue: JSON.parse(JSON.stringify(created)),
        },
      });

      return created;
    });

    return NextResponse.json({
      data: newParent,
      message: "Parent profile created successfully.",
    });
  } catch (err) {
    console.error("[parents] POST error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
