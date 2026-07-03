import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { FeeItemSchema, UpdateFeeItemSchema } from "@/schemas/fee.schema";

async function getClientIp(request: NextRequest): Promise<string> {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  return realIp ?? "unknown";
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const items = await prisma.feeItem.findMany({
      where: { schoolId: guard.session.schoolId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch fee items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const ip = await getClientIp(request);
    const rl = await rateLimit(ip, { prefix: "rate_limit:fee_create", maxRequests: 30, windowSeconds: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please slow down.", code: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = FeeItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const data = parsed.data;

    const existing = await prisma.feeItem.findFirst({
      where: { schoolId: guard.session.schoolId, name: data.name },
    });
    if (existing) {
      return NextResponse.json({ error: "A fee item with this name already exists.", code: "DUPLICATE" }, { status: 409 });
    }

    const [item] = await prisma.$transaction(async (tx) => {
      const item = await tx.feeItem.create({
        data: {
          schoolId: guard.session.schoolId,
          name: data.name,
          description: data.description ?? null,
          type: data.type,
          billingFrequency: data.billingFrequency,
          amount: data.amount,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName ?? "Admin",
          action: "FEE_ITEM_CREATED",
          entityType: "FeeItem",
          entityId: item.id,
          newValue: JSON.parse(JSON.stringify(item)),
        },
      });

      return [item];
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A fee item with this name already exists.", code: "DUPLICATE" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create fee item", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Fee item ID is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const existing = await prisma.feeItem.findFirst({
      where: { id, schoolId: guard.session.schoolId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Fee item not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = UpdateFeeItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const data = parsed.data;

    if (data.name && data.name !== existing.name) {
      const nameExists = await prisma.feeItem.findFirst({
        where: { schoolId: guard.session.schoolId, name: data.name, id: { not: id } },
      });
      if (nameExists) {
        return NextResponse.json({ error: "A fee item with this name already exists.", code: "DUPLICATE" }, { status: 409 });
      }
    }

    const [updated] = await prisma.$transaction(async (tx) => {
      const updated = await tx.feeItem.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description ?? null }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.billingFrequency !== undefined && { billingFrequency: data.billingFrequency }),
          ...(data.amount !== undefined && { amount: data.amount }),
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName ?? "Admin",
          action: "FEE_ITEM_UPDATED",
          entityType: "FeeItem",
          entityId: id,
          previousValue: JSON.parse(JSON.stringify(existing)),
          newValue: JSON.parse(JSON.stringify(updated)),
        },
      });

      return [updated];
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A fee item with this name already exists.", code: "DUPLICATE" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update fee item", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Fee item ID is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const existing = await prisma.feeItem.findFirst({
      where: { id, schoolId: guard.session.schoolId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Fee item not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const templateUsage = await prisma.classFeeTemplateItem.findFirst({
      where: { feeItemId: id },
    });
    if (templateUsage) {
      return NextResponse.json(
        { error: `Cannot delete "${existing.name}" — it is used in fee templates. Deactivate it instead.`, code: "IN_USE" },
        { status: 409 }
      );
    }

    const invoiceUsage = await prisma.invoiceLineItem.findFirst({
      where: { feeItemId: id },
    });
    if (invoiceUsage) {
      return NextResponse.json(
        { error: `Cannot delete "${existing.name}" — it appears on existing invoices. Deactivate it instead.`, code: "IN_USE" },
        { status: 409 }
      );
    }

    const [deleted] = await prisma.$transaction(async (tx) => {
      const deleted = await tx.feeItem.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName ?? "Admin",
          action: "FEE_ITEM_DELETED",
          entityType: "FeeItem",
          entityId: id,
          previousValue: JSON.parse(JSON.stringify(existing)),
        },
      });

      return [deleted];
    });

    return NextResponse.json({ data: deleted });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete fee item", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
