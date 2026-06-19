import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

const FeeItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(["mandatory", "optional"]).default("mandatory"),
  billingFrequency: z.enum(["per_term", "per_session", "one_off"]).default("per_term"),
  amount: z.union([z.number(), z.string()]).transform((val) => new Prisma.Decimal(val)),
});

const UpdateFeeItemSchema = FeeItemSchema.partial().extend({
  id: z.string().min(1, "ID is required"),
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

    const feeItems = await prisma.feeItem.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: feeItems });
  } catch (err) {
    console.error("[fees/library] GET error:", err);
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
    const parsed = FeeItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check unique name inside school
    const existing = await prisma.feeItem.findFirst({
      where: {
        schoolId: session.schoolId,
        name: data.name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A fee item with this name already exists.", code: "CONFLICT" },
        { status: 409 }
      );
    }

    const newFeeItem = await prisma.$transaction(async (tx) => {
      const created = await tx.feeItem.create({
        data: {
          schoolId: session.schoolId,
          name: data.name.trim(),
          description: data.description || null,
          type: data.type,
          billingFrequency: data.billingFrequency,
          amount: data.amount,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: "FEE_ITEM_CREATED",
          entityType: "FeeItem",
          entityId: created.id,
          newValue: JSON.parse(JSON.stringify(created)),
        },
      });

      return created;
    });

    return NextResponse.json({
      data: newFeeItem,
      message: "Fee item created successfully.",
    });
  } catch (err: any) {
    console.error("[fees/library] POST error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = UpdateFeeItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    const existingItem = await prisma.feeItem.findFirst({
      where: { id, schoolId: session.schoolId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Fee item not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (updateData.name) {
      const duplicate = await prisma.feeItem.findFirst({
        where: {
          schoolId: session.schoolId,
          name: updateData.name.trim(),
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A fee item with this name already exists.", code: "CONFLICT" },
          { status: 409 }
        );
      }
    }

    const updatedFeeItem = await prisma.$transaction(async (tx) => {
      const updated = await tx.feeItem.update({
        where: { id },
        data: {
          name: updateData.name ? updateData.name.trim() : undefined,
          description: updateData.description !== undefined ? (updateData.description || null) : undefined,
          type: updateData.type,
          billingFrequency: updateData.billingFrequency,
          amount: updateData.amount,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: "FEE_ITEM_UPDATED",
          entityType: "FeeItem",
          entityId: updated.id,
          previousValue: JSON.parse(JSON.stringify(existingItem)),
          newValue: JSON.parse(JSON.stringify(updated)),
        },
      });

      return updated;
    });

    return NextResponse.json({
      data: updatedFeeItem,
      message: "Fee item updated successfully.",
    });
  } catch (err: any) {
    console.error("[fees/library] PUT error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const existingItem = await prisma.feeItem.findFirst({
      where: { id, schoolId: session.schoolId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Fee item not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check if it's referenced in any class fee templates
    const templateItemCount = await prisma.classFeeTemplateItem.count({
      where: { feeItemId: id },
    });

    if (templateItemCount > 0) {
      return NextResponse.json(
        {
          error: "This fee item cannot be deleted because it is used in one or more class fee templates.",
          code: "REFERENCE_CONSTRAINT",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.feeItem.delete({ where: { id } });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: "FEE_ITEM_DELETED",
          entityType: "FeeItem",
          entityId: id,
          previousValue: JSON.parse(JSON.stringify(existingItem)),
        },
      });
    });

    return NextResponse.json({
      message: "Fee item deleted successfully.",
    });
  } catch (err: any) {
    console.error("[fees/library] DELETE error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
