import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireVerifiedAdminUser } from "@/lib/auth/require-verified-admin";

// Helpers for term sorting
const termOrder = ["first", "second", "third", "fourth", "fifth"];
const getTermWeight = (name: string) => {
  const lower = name.toLowerCase();
  for (let i = 0; i < termOrder.length; i++) {
    if (lower.includes(termOrder[i])) return i;
  }
  return 99;
};

async function getPreviousTerm(schoolId: string, currentTermId: string) {
  const terms = await prisma.academicTerm.findMany({
    where: { schoolId },
    include: { session: true },
  });

  if (terms.length === 0) return null;

  // Sort chronologically
  terms.sort((a, b) => {
    const sessionComp = a.session.name.localeCompare(b.session.name);
    if (sessionComp !== 0) return sessionComp;
    return getTermWeight(a.name) - getTermWeight(b.name);
  });

  const currentIndex = terms.findIndex((t) => t.id === currentTermId);
  if (currentIndex <= 0) return null;
  return terms[currentIndex - 1];
}

// Validation schemas
const GenerationPreviewSchema = z.object({
  classLevelId: z.string().min(1, "Class level is required"),
  termId: z.string().min(1, "Term is required"),
  templateId: z.string().optional(),
});

const GenerateInvoicesSchema = z.object({
  classLevelId: z.string().min(1, "Class level is required"),
  termId: z.string().min(1, "Term is required"),
  templateId: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  studentIds: z.array(z.string()).optional(), // If provided, generate for these specifically
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
    const classLevelId = searchParams.get("classLevelId") ?? "";
    const termId = searchParams.get("termId") ?? "";
    const templateId = searchParams.get("templateId") || undefined;

    const parsed = GenerationPreviewSchema.safeParse({ classLevelId, termId, templateId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid params", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Resolve template if not provided
    let targetTemplateId = templateId;
    if (!targetTemplateId) {
      const activeTemplate = await prisma.classFeeTemplate.findFirst({
        where: { classLevelId, termId, schoolId: session.schoolId, status: "published" },
      });
      targetTemplateId = activeTemplate?.id;
    }

    if (!targetTemplateId) {
      return NextResponse.json({
        data: [],
        warning: "No published fee template found for this class level and term. Invoices will have zero baseline fees unless a template is published or selected.",
      });
    }

    // Fetch template items
    const templateItems = await prisma.classFeeTemplateItem.findMany({
      where: { templateId: targetTemplateId },
      include: { feeItem: true },
    });

    // Fetch students in this class level
    const students = await prisma.student.findMany({
      where: { classLevelId, schoolId: session.schoolId, status: "active" },
      include: {
        classArm: true,
      },
    });

    const previousTerm = await getPreviousTerm(session.schoolId, termId);

    const previews = await Promise.all(
      students.map(async (student) => {
        // Check duplicate invoice
        const existingInvoice = await prisma.invoice.findUnique({
          where: { studentId_termId: { studentId: student.id, termId } },
        });

        // Check carryover balance
        let carryoverAmount = new Prisma.Decimal(0);
        if (previousTerm) {
          const prevInvoice = await prisma.invoice.findFirst({
            where: { studentId: student.id, termId: previousTerm.id },
          });
          if (prevInvoice) {
            carryoverAmount = prevInvoice.balanceDue;
          }
        }

        // Calculate total fee items
        let feesAmount = new Prisma.Decimal(0);
        templateItems.forEach((item) => {
          feesAmount = feesAmount.plus(item.amountOverride ?? item.feeItem.amount);
        });

        const totalExpected = feesAmount.plus(carryoverAmount);

        return {
          studentId: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          classArm: student.classArm.name,
          feesAmount,
          carryoverAmount,
          totalExpected,
          alreadyHasInvoice: !!existingInvoice,
          existingInvoiceId: existingInvoice?.id || null,
        };
      })
    );

    return NextResponse.json({ data: previews });
  } catch (err: any) {
    console.error("[invoices/generate] GET error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
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
    const parsed = GenerateInvoicesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { classLevelId, termId, templateId, dueDate, studentIds } = parsed.data;

    // Resolve template if not provided
    let targetTemplateId = templateId;
    if (!targetTemplateId) {
      const activeTemplate = await prisma.classFeeTemplate.findFirst({
        where: { classLevelId, termId, schoolId: session.schoolId, status: "published" },
      });
      targetTemplateId = activeTemplate?.id;
    }

    // Fetch template items
    const templateItems = targetTemplateId
      ? await prisma.classFeeTemplateItem.findMany({
          where: { templateId: targetTemplateId },
          include: { feeItem: true },
        })
      : [];

    // Fetch students to process
    const whereClause: any = { classLevelId, schoolId: session.schoolId, status: "active" };
    if (studentIds && studentIds.length > 0) {
      whereClause.id = { in: studentIds };
    }

    const students = await prisma.student.findMany({
      where: whereClause,
    });

    if (students.length === 0) {
      return NextResponse.json(
        { error: "No active students found in this class level to generate invoices for.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const previousTerm = await getPreviousTerm(session.schoolId, termId);
    const parsedDueDate = new Date(dueDate);

    const results = await prisma.$transaction(async (tx) => {
      const generatedInvoices = [];

      for (const student of students) {
        // Prevent duplicate invoice
        const existing = await tx.invoice.findUnique({
          where: { studentId_termId: { studentId: student.id, termId } },
        });

        if (existing) {
          // Skip or report warning. Since bulk wizard does duplicate prevention, we skip already generated ones to avoid throwing.
          continue;
        }

        // Check carryover balance
        let carryoverAmount = new Prisma.Decimal(0);
        if (previousTerm) {
          const prevInvoice = await tx.invoice.findFirst({
            where: { studentId: student.id, termId: previousTerm.id },
          });
          if (prevInvoice) {
            carryoverAmount = prevInvoice.balanceDue;
          }
        }

        // Calculate baseline amount
        let baselineAmount = new Prisma.Decimal(0);
        const lineItemsData = [];

        // Add fee items from template
        for (const item of templateItems) {
          const amount = item.amountOverride ?? item.feeItem.amount;
          baselineAmount = baselineAmount.plus(amount);
          lineItemsData.push({
            feeItemId: item.feeItemId,
            name: item.feeItem.name,
            amount,
            lineType: "fee_item" as const,
          });
        }

        // Add carryover line item if applicable
        if (carryoverAmount.greaterThan(0)) {
          baselineAmount = baselineAmount.plus(carryoverAmount);
          lineItemsData.push({
            name: "Previous Term Balance",
            amount: carryoverAmount,
            lineType: "carryover" as const,
          });
        }

        // Create the Invoice
        const invoice = await tx.invoice.create({
          data: {
            schoolId: session.schoolId,
            studentId: student.id,
            termId,
            templateId: targetTemplateId || null,
            status: "draft", // Initially draft
            dueDate: parsedDueDate,
            totalAmount: baselineAmount,
            discountAmount: new Prisma.Decimal(0),
            finalAmount: baselineAmount,
            amountPaid: new Prisma.Decimal(0),
            balanceDue: baselineAmount,
            lineItems: {
              create: lineItemsData,
            },
          },
        });

        generatedInvoices.push(invoice);

        // Audit Log for each invoice created
        await tx.auditLog.create({
          data: {
            schoolId: session.schoolId,
            actorId: session.userId,
            actorName: session.fullName,
            action: "INVOICE_GENERATED",
            entityType: "Invoice",
            entityId: invoice.id,
            newValue: JSON.parse(JSON.stringify(invoice)),
          },
        });
      }

      return generatedInvoices;
    });

    return NextResponse.json({
      data: results,
      count: results.length,
      message: `Successfully generated ${results.length} invoices.`,
    });
  } catch (err: any) {
    console.error("[invoices/generate] POST error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
