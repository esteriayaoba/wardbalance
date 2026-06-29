import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

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

  terms.sort((a, b) => {
    const sessionComp = a.session.name.localeCompare(b.session.name);
    if (sessionComp !== 0) return sessionComp;
    return getTermWeight(a.name) - getTermWeight(b.name);
  });

  const currentIndex = terms.findIndex((t) => t.id === currentTermId);
  if (currentIndex <= 0) return null;
  return terms[currentIndex - 1];
}

export async function previewInvoiceGeneration(
  schoolId: string,
  classLevelId: string,
  termId: string,
  templateId?: string
) {
  let targetTemplateId = templateId;
  if (!targetTemplateId) {
    const activeTemplate = await prisma.classFeeTemplate.findFirst({
      where: { classLevelId, termId, schoolId, status: "published" },
    });
    targetTemplateId = activeTemplate?.id;
  }

  if (!targetTemplateId) {
    return { previews: [], warning: "No published fee template found for this class level and term." };
  }

  const templateItems = await prisma.classFeeTemplateItem.findMany({
    where: { templateId: targetTemplateId },
    include: { feeItem: true },
  });

  const students = await prisma.student.findMany({
    where: { classLevelId, schoolId, status: "active" },
    include: { classArm: true },
  });

  const previousTerm = await getPreviousTerm(schoolId, termId);

  const previews = await Promise.all(
    students.map(async (student) => {
      const existingInvoice = await prisma.invoice.findUnique({
        where: { studentId_termId: { studentId: student.id, termId } },
      });

      let carryoverAmount = new Prisma.Decimal(0);
      if (previousTerm) {
        const prevInvoice = await prisma.invoice.findFirst({
          where: { studentId: student.id, termId: previousTerm.id },
        });
        if (prevInvoice) {
          carryoverAmount = prevInvoice.balanceDue;
        }
      }

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

  return { previews, warning: null };
}

export interface GenerateInvoicesOptions {
  schoolId: string;
  actorId: string;
  actorName: string;
  classLevelId: string;
  termId: string;
  templateId?: string;
  dueDate: Date;
  studentIds?: string[];
}

export async function generateInvoices(options: GenerateInvoicesOptions) {
  const { schoolId, actorId, actorName, classLevelId, termId, templateId, dueDate, studentIds } = options;

  let targetTemplateId = templateId;
  if (!targetTemplateId) {
    const activeTemplate = await prisma.classFeeTemplate.findFirst({
      where: { classLevelId, termId, schoolId, status: "published" },
    });
    targetTemplateId = activeTemplate?.id;
  }

  const templateItems = targetTemplateId
    ? await prisma.classFeeTemplateItem.findMany({
        where: { templateId: targetTemplateId },
        include: { feeItem: true },
      })
    : [];

  const whereClause: Parameters<typeof prisma.student.findMany>[0] = {
    where: {
      classLevelId,
      schoolId,
      status: "active",
      ...(studentIds && studentIds.length > 0 ? { id: { in: studentIds } } : {}),
    },
  };

  const students = await prisma.student.findMany(whereClause);

  if (students.length === 0) {
    return { invoices: [], count: 0, message: "No active students found." };
  }

  const previousTerm = await getPreviousTerm(schoolId, termId);

  const results = await prisma.$transaction(async (tx) => {
    const generatedInvoices = [];

    for (const student of students) {
      const existing = await tx.invoice.findUnique({
        where: { studentId_termId: { studentId: student.id, termId } },
      });
      if (existing) continue;

      let carryoverAmount = new Prisma.Decimal(0);
      if (previousTerm) {
        const prevInvoice = await tx.invoice.findFirst({
          where: { studentId: student.id, termId: previousTerm.id },
        });
        if (prevInvoice) {
          carryoverAmount = prevInvoice.balanceDue;
        }
      }

      let baselineAmount = new Prisma.Decimal(0);
      const lineItemsData: { feeItemId?: string; name: string; amount: Prisma.Decimal; lineType: "fee_item" | "carryover" }[] = [];

      for (const item of templateItems) {
        const amount = item.amountOverride ?? item.feeItem.amount;
        baselineAmount = baselineAmount.plus(amount);
        lineItemsData.push({
          feeItemId: item.feeItemId,
          name: item.feeItem.name,
          amount,
          lineType: "fee_item",
        });
      }

      if (carryoverAmount.greaterThan(0)) {
        baselineAmount = baselineAmount.plus(carryoverAmount);
        lineItemsData.push({
          name: "Previous Term Balance",
          amount: carryoverAmount,
          lineType: "carryover",
        });
      }

      const invoice = await tx.invoice.create({
        data: {
          schoolId,
          studentId: student.id,
          termId,
          templateId: targetTemplateId || null,
          status: "draft",
          dueDate,
          totalAmount: baselineAmount,
          discountAmount: new Prisma.Decimal(0),
          finalAmount: baselineAmount,
          amountPaid: new Prisma.Decimal(0),
          balanceDue: baselineAmount,
          lineItems: { create: lineItemsData },
        },
      });

      generatedInvoices.push(invoice);

      await tx.auditLog.create({
        data: {
          schoolId,
          actorId,
          actorName,
          action: "INVOICE_GENERATED",
          entityType: "Invoice",
          entityId: invoice.id,
          newValue: JSON.parse(JSON.stringify(invoice)),
        },
      });
    }

    return generatedInvoices;
  });

  return {
    invoices: results,
    count: results.length,
    message: `Successfully generated ${results.length} invoices.`,
  };
}
