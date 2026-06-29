import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireVerifiedAdminUser } from "@/lib/auth/require-verified-admin";

const TemplateItemInputSchema = z.object({
  feeItemId: z.string().min(1, "Fee item ID is required"),
  amountOverride: z.union([z.number(), z.string(), z.null(), z.undefined()]).transform((val) => {
    if (val === null || val === undefined || val === "") return null;
    return new Prisma.Decimal(val);
  }),
});

const ClassFeeTemplateSchema = z.object({
  classLevelId: z.string().min(1, "Class level is required"),
  termId: z.string().min(1, "Term is required"),
  status: z.enum(["draft", "published"]).default("draft"),
  items: z.array(TemplateItemInputSchema).min(1, "At least one fee item is required"),
});

const UpdateClassFeeTemplateSchema = z.object({
  id: z.string().min(1, "Template ID is required"),
  status: z.enum(["draft", "published"]).optional(),
  items: z.array(TemplateItemInputSchema).optional(),
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

    const { searchParams } = new URL(request.url);
    const termId = searchParams.get("termId");
    const classLevelId = searchParams.get("classLevelId");

    const where: any = { schoolId: session.schoolId };
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
    console.error("[fees/templates] GET error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireVerifiedAdminUser();
    if (!guard.authorized) {
      return guard.response;
    }
    const session = guard.session;

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
      where: { id: termId, schoolId: session.schoolId },
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
      where: { id: classLevelId, schoolId: session.schoolId },
    });

    if (!level) {
      return NextResponse.json(
        { error: "Class level not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check unique template for classLevel + term
    const existing = await prisma.classFeeTemplate.findUnique({
      where: {
        classLevelId_termId: { classLevelId, termId },
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
          schoolId: session.schoolId,
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
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
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
  } catch (err: any) {
    console.error("[fees/templates] POST error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const guard = await requireVerifiedAdminUser();
    if (!guard.authorized) {
      return guard.response;
    }
    const session = guard.session;

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
      where: { id, schoolId: session.schoolId },
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
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
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
  } catch (err: any) {
    console.error("[fees/templates] PUT error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireVerifiedAdminUser();
    if (!guard.authorized) {
      return guard.response;
    }
    const session = guard.session;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const existing = await prisma.classFeeTemplate.findFirst({
      where: { id, schoolId: session.schoolId },
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
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
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
  } catch (err: any) {
    console.error("[fees/templates] DELETE error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
