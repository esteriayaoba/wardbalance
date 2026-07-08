import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { ClassFeeTemplateSchema, UpdateClassFeeTemplateSchema } from "@/schemas/fee.schema";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const termId = searchParams.get("termId");
    const classLevelId = searchParams.get("classLevelId");

    const where: any = { schoolId: guard.session.schoolId };
    if (termId) where.termId = termId;
    if (classLevelId) where.classLevelId = classLevelId;

    const templates = await prisma.classFeeTemplate.findMany({
      where,
      include: {
        classLevel: true,
        term: {
          include: {
            session: true,
          },
        },
        items: {
          include: {
            feeItem: true,
          },
        },
      },
      orderBy: { classLevel: { name: "asc" } },
    });

    return NextResponse.json({ data: templates });
  } catch (err) {
    logError("fees/templates GET", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = ClassFeeTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { classLevelId, termId, status, items } = parsed.data;

    // Check if the term exists and is not locked
    const term = await prisma.academicTerm.findFirst({
      where: { id: termId, schoolId: guard.session.schoolId },
    });

    if (!term) {
      return NextResponse.json(
        { error: "Academic term not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (term.status === "locked") {
      return NextResponse.json(
        { error: "Cannot create template for a locked term.", code: "TERM_LOCKED" },
        { status: 400 }
      );
    }

    // Check if class level exists
    const level = await prisma.classLevel.findFirst({
      where: { id: classLevelId, schoolId: guard.session.schoolId },
    });

    if (!level) {
      return NextResponse.json(
        { error: "Class level not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check unique template for this school + classLevel + term
    const existing = await prisma.classFeeTemplate.findUnique({
      where: {
        schoolId_classLevelId_termId: { schoolId: guard.session.schoolId, classLevelId, termId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A template already exists for this class level and term. Try editing it instead.", code: "CONFLICT" },
        { status: 409 }
      );
    }

    const template = await prisma.$transaction(async (tx) => {
      // Create template
      const created = await tx.classFeeTemplate.create({
        data: {
          schoolId: guard.session.schoolId,
          classLevelId,
          termId,
          status,
        },
      });

      // Create items
      await Promise.all(
        items.map((item) =>
          tx.classFeeTemplateItem.create({
            data: {
              templateId: created.id,
              feeItemId: item.feeItemId,
              amountOverride: item.amountOverride,
            },
          })
        )
      );

      const fullTemplate = await tx.classFeeTemplate.findUnique({
        where: { id: created.id },
        include: {
          items: {
            include: { feeItem: true },
          },
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName,
          action: "FEE_TEMPLATE_CREATED",
          entityType: "ClassFeeTemplate",
          entityId: created.id,
          newValue: JSON.parse(JSON.stringify(fullTemplate)),
        },
      });

      return fullTemplate;
    });

    return NextResponse.json({
      data: template,
      message: "Class fee template created successfully.",
    });
  } catch (err: unknown) {
    logError("fees/templates POST", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = UpdateClassFeeTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { id, status, items } = parsed.data;

    // Check template
    const existing = await prisma.classFeeTemplate.findFirst({
      where: { id, schoolId: guard.session.schoolId },
      include: {
        term: true,
        items: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Class fee template not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (existing.term.status === "locked") {
      return NextResponse.json(
        { error: "Cannot modify template for a locked term.", code: "TERM_LOCKED" },
        { status: 400 }
      );
    }

    const updatedTemplate = await prisma.$transaction(async (tx) => {
      // Update template base status
      const updatedBase = await tx.classFeeTemplate.update({
        where: { id },
        data: {
          status: status ?? undefined,
        },
      });

      // Update items if provided
      if (items !== undefined) {
        // Delete all old items
        await tx.classFeeTemplateItem.deleteMany({
          where: { templateId: id },
        });

        // Insert new items
        await Promise.all(
          items.map((item) =>
            tx.classFeeTemplateItem.create({
              data: {
                templateId: id,
                feeItemId: item.feeItemId,
                amountOverride: item.amountOverride,
              },
            })
          )
        );
      }

      const fullTemplate = await tx.classFeeTemplate.findUnique({
        where: { id },
        include: {
          items: {
            include: { feeItem: true },
          },
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName,
          action: "FEE_TEMPLATE_UPDATED",
          entityType: "ClassFeeTemplate",
          entityId: id,
          previousValue: JSON.parse(JSON.stringify(existing)),
          newValue: JSON.parse(JSON.stringify(fullTemplate)),
        },
      });

      return fullTemplate;
    });

    return NextResponse.json({
      data: updatedTemplate,
      message: "Class fee template updated successfully.",
    });
  } catch (err: unknown) {
    logError("fees/templates PUT", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const existing = await prisma.classFeeTemplate.findFirst({
      where: { id, schoolId: guard.session.schoolId },
      include: {
        term: true,
        items: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Class fee template not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (existing.term.status === "locked") {
      return NextResponse.json(
        { error: "Cannot delete template for a locked term.", code: "TERM_LOCKED" },
        { status: 400 }
      );
    }

    // Check if it's referenced by any generated invoices
    const invoiceCount = await prisma.invoice.count({
      where: { templateId: id },
    });

    if (invoiceCount > 0) {
      return NextResponse.json(
        {
          error: "This template cannot be deleted because invoices have already been generated from it.",
          code: "REFERENCE_CONSTRAINT",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Items delete cascade automatically because of DB schema onDelete: Cascade
      await tx.classFeeTemplate.delete({ where: { id } });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName,
          action: "FEE_TEMPLATE_DELETED",
          entityType: "ClassFeeTemplate",
          entityId: id,
          previousValue: JSON.parse(JSON.stringify(existing)),
        },
      });
    });

    return NextResponse.json({
      message: "Class fee template deleted successfully.",
    });
  } catch (err: unknown) {
    logError("fees/templates DELETE", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
