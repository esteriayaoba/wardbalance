import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { enqueueNotification } from "@/lib/notifications";
import { hasExistingInvoice } from "@/modules/invoices/logic";

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

  const studentIds = students.map((s) => s.id);
  const existingInvoices = await prisma.invoice.findMany({
    where: { studentId: { in: studentIds }, termId },
    select: { studentId: true, id: true },
  });
  const existingMap = new Map(existingInvoices.map((i) => [i.studentId, i]));

  let prevInvoicesMap = new Map<string, Prisma.Decimal>();
  if (previousTerm) {
    const prevInvoices = await prisma.invoice.findMany({
      where: { studentId: { in: studentIds }, termId: previousTerm.id },
      select: { studentId: true, balanceDue: true },
    });
    prevInvoicesMap = new Map(prevInvoices.map((i) => [i.studentId, i.balanceDue]));
  }

  const previews = students.map((student) => {
    const existingInvoice = existingMap.get(student.id);
    const prevBalance = prevInvoicesMap.get(student.id) ?? new Prisma.Decimal(0);

    let feesAmount = new Prisma.Decimal(0);
    templateItems.forEach((item) => {
      feesAmount = feesAmount.plus(item.amountOverride ?? item.feeItem.amount);
    });

    const totalExpected = feesAmount.plus(prevBalance);

    return {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      admissionNumber: student.admissionNumber,
      classArm: student.classArm.name,
      feesAmount,
      carryoverAmount: prevBalance,
      totalExpected,
      alreadyHasInvoice: !!existingInvoice,
      existingInvoiceId: existingInvoice?.id || null,
    };
  });

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

  const targetTerm = await prisma.academicTerm.findUnique({
    where: { id: termId },
    include: { session: { select: { name: true } } },
  });

  if (!targetTerm) {
    throw new Error("Target term not found");
  }

  if (targetTerm.status === "locked") {
    throw new Error("Cannot generate invoices for a locked term. Unlock the term first.");
  }

  const previousTerm = await getPreviousTerm(schoolId, termId);
  const allStudentIds = students.map((s) => s.id);

  const existingInvoices = await prisma.invoice.findMany({
    where: { studentId: { in: allStudentIds }, termId },
    select: { studentId: true },
  });
  const existingSet = new Set(existingInvoices.map((i) => i.studentId));

  let prevInvoicesMap = new Map<string, Prisma.Decimal>();
  if (previousTerm) {
    const prevInvoices = await prisma.invoice.findMany({
      where: { studentId: { in: allStudentIds }, termId: previousTerm.id },
      select: { studentId: true, balanceDue: true },
    });
    prevInvoicesMap = new Map(prevInvoices.map((i) => [i.studentId, i.balanceDue]));
  }

  const optionalEnrolments = await prisma.studentActivityEnrolment.findMany({
    where: { studentId: { in: allStudentIds }, sessionId: targetTerm.sessionId },
    include: { feeItem: true },
  });
  const enrolmentsByStudent = new Map<string, typeof optionalEnrolments>();
  for (const enr of optionalEnrolments) {
    const list = enrolmentsByStudent.get(enr.studentId) ?? [];
    list.push(enr);
    enrolmentsByStudent.set(enr.studentId, list);
  }

  const siblingRules = await prisma.discountRule.findMany({
    where: { schoolId, isActive: true, condition: "sibling_count" }
  });

  const allStudentLinks = await prisma.parentWardLink.findMany({
    where: { studentId: { in: allStudentIds }, schoolId },
  });
  const parentIds = [...new Set(allStudentLinks.map((l) => l.parentId))];

  const siblingLinksByParent = new Map<string, { studentId: string; createdAt: Date }[]>();
  if (parentIds.length > 0 && siblingRules.length > 0) {
    const allSiblingLinks = await prisma.parentWardLink.findMany({
      where: { parentId: { in: parentIds } },
      include: { student: { select: { createdAt: true } } },
      orderBy: { student: { createdAt: "asc" } },
    });
    for (const link of allSiblingLinks) {
      const list = siblingLinksByParent.get(link.parentId) ?? [];
      list.push({ studentId: link.studentId, createdAt: link.student.createdAt });
      siblingLinksByParent.set(link.parentId, list);
    }
  }

  const parentsByStudent = new Map<string, string[]>();
  for (const link of allStudentLinks) {
    const list = parentsByStudent.get(link.studentId) ?? [];
    list.push(link.parentId);
    parentsByStudent.set(link.studentId, list);
  }

  const studentsToProcess = students.filter((s) => !hasExistingInvoice(existingSet, s.id));

  if (studentsToProcess.length === 0) {
    return { invoices: [], count: 0, message: "All students already have invoices for this term." };
  }

  function buildInvoicePayload(student: typeof students[0]) {
    const carryoverAmount = prevInvoicesMap.get(student.id) ?? new Prisma.Decimal(0);

    let baselineAmount = new Prisma.Decimal(0);
    const lineItemsData: {
      feeItemId?: string;
      name: string;
      amount: Prisma.Decimal;
      lineType: "fee_item" | "carryover" | "discount";
    }[] = [];

    for (const item of templateItems) {
      const amount = item.amountOverride ?? item.feeItem.amount;
      baselineAmount = baselineAmount.plus(amount);
      lineItemsData.push({ feeItemId: item.feeItemId, name: item.feeItem.name, amount, lineType: "fee_item" });
    }

    if (carryoverAmount.greaterThan(0)) {
      baselineAmount = baselineAmount.plus(carryoverAmount);
      lineItemsData.push({ name: "Previous Term Balance", amount: carryoverAmount, lineType: "carryover" });
    }

    const studentEnrolments = enrolmentsByStudent.get(student.id) ?? [];
    for (const enrolment of studentEnrolments) {
      const amount = enrolment.feeItem.amount;
      baselineAmount = baselineAmount.plus(amount);
      lineItemsData.push({
        feeItemId: enrolment.feeItemId,
        name: `${enrolment.feeItem.name} (Optional)`,
        amount,
        lineType: "fee_item",
      });
    }

    let calculatedDiscount = new Prisma.Decimal(0);
    if (siblingRules.length > 0) {
      const studentParentIds = parentsByStudent.get(student.id) ?? [];
      for (const parentId of studentParentIds) {
        const allSiblings = siblingLinksByParent.get(parentId) ?? [];
        const siblingsCount = allSiblings.length;
        const studentIndex = allSiblings.findIndex((s) => s.studentId === student.id);

        for (const rule of siblingRules) {
          const threshold = parseInt(rule.conditionValue || "2", 10);
          if (siblingsCount >= threshold && studentIndex >= threshold - 1) {
            let ruleDiscount = new Prisma.Decimal(0);
            if (rule.type === "percentage") {
              ruleDiscount = baselineAmount.times(new Prisma.Decimal(rule.value)).dividedBy(100);
            } else {
              ruleDiscount = new Prisma.Decimal(rule.value);
            }
            calculatedDiscount = calculatedDiscount.plus(ruleDiscount);
            lineItemsData.push({ name: `Discount: ${rule.name}`, amount: ruleDiscount, lineType: "discount" });
          }
        }
      }
    }

    const finalAmount = Prisma.Decimal.max(0, baselineAmount.minus(calculatedDiscount));
    return { baselineAmount, calculatedDiscount, finalAmount, lineItemsData };
  }

  async function processBatch(batch: typeof students) {
    return prisma.$transaction(async (tx) => {
      const created = await Promise.all(
        batch.map(async (student) => {
          const { baselineAmount, calculatedDiscount, finalAmount, lineItemsData } = buildInvoicePayload(student);

          return tx.invoice.create({
            data: {
              schoolId,
              studentId: student.id,
              termId,
              templateId: targetTemplateId || null,
              status: "issued",
              dueDate,
              totalAmount: baselineAmount,
              discountAmount: calculatedDiscount,
              finalAmount,
              amountPaid: new Prisma.Decimal(0),
              balanceDue: finalAmount,
              lineItems: { create: lineItemsData },
            },
          });
        })
      );

      await tx.auditLog.createMany({
        data: created.map((invoice) => ({
          schoolId,
          actorId,
          actorName,
          action: "INVOICE_GENERATED",
          entityType: "Invoice",
          entityId: invoice.id,
          newValue: JSON.parse(JSON.stringify(invoice)),
        })),
      });

      return created;
    });
  }

  const BATCH_SIZE = 20;
  const allGeneratedInvoices: Awaited<ReturnType<typeof processBatch>> = [];

  for (let i = 0; i < studentsToProcess.length; i += BATCH_SIZE) {
    const batch = studentsToProcess.slice(i, i + BATCH_SIZE);
    const batchResult = await processBatch(batch);
    allGeneratedInvoices.push(...batchResult);
  }

  if (allGeneratedInvoices.length > 0) {
    const studentIdsWithInvoices = allGeneratedInvoices.map((inv) => inv.studentId);
    const parentLinks = await prisma.parentWardLink.findMany({
      where: {
        studentId: { in: studentIdsWithInvoices },
        receivesInvoiceNotifications: true,
      },
      include: { parent: { select: { email: true, phone: true } } },
    });

    const termLabel = `${targetTerm.session?.name || ""} — ${targetTerm.name}`;

    await Promise.allSettled(
      parentLinks.map((link) =>
        enqueueNotification({
          schoolId,
          parentId: link.parentId,
          channel: "email",
          recipient: link.parent.email || link.parent.phone,
          subject: "New Invoice — WardBalance",
          content: `A new invoice has been generated for ${termLabel}. Please log in to the parent portal to view the details and make payment.`,
          reference: `invoice-generated-${termId}`,
        }).catch(() => {})
      )
    );
  }

  return {
    invoices: allGeneratedInvoices,
    count: allGeneratedInvoices.length,
    message: `Successfully generated ${allGeneratedInvoices.length} invoices.`,
  };
}
