import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { CreateParentSchema } from "@/schemas/parent.schema";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const where: Record<string, unknown> = { schoolId: guard.session.schoolId };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const [parents, total] = await Promise.all([
      prisma.parent.findMany({
        where,
        include: {
          wards: {
            include: {
              student: {
                include: {
                  classLevel: true,
                  classArm: true,
                },
              },
            },
          },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: limit,
        skip: offset,
      }),
      prisma.parent.count({ where }),
    ]);

    return NextResponse.json({ data: parents, meta: { total, limit, offset } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch parents", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = CreateParentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.parent.findFirst({
      where: { schoolId: guard.session.schoolId, phone: data.phone },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A parent with this phone number already exists.", code: "DUPLICATE" },
        { status: 409 }
      );
    }

    const [parent] = await prisma.$transaction(async (tx) => {
      const parent = await tx.parent.create({
        data: {
          schoolId: guard.session.schoolId,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email || null,
          address: data.address || null,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName ?? "Admin",
          action: "PARENT_REGISTERED",
          entityType: "Parent",
          entityId: parent.id,
          newValue: JSON.parse(JSON.stringify(parent)),
        },
      });

      return [parent];
    });

    return NextResponse.json({ data: parent }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create parent", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
