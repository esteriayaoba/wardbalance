import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { encryptPassword } from "@/lib/auth/auth";

export interface DemoSeedResult {
  schoolId: string;
  userId: string;
}

export const DEMO_PASSWORD = "Demo@123456";

export async function seedDemoSchool(): Promise<DemoSeedResult> {
  const DEMO_SCHOOL_NAME = "Demo International School";
  const DEMO_EMAIL = "demo@wardbalance.local";
  const demoHash = await encryptPassword(DEMO_PASSWORD);

  // Check if demo school already exists — reuse it, updating password
  const existingSchool = await prisma.school.findFirst({
    where: { name: DEMO_SCHOOL_NAME },
    include: { users: { where: { email: DEMO_EMAIL } } },
  });

  if (existingSchool && existingSchool.users.length > 0) {
    const existingUser = existingSchool.users[0];
    // Ensure the demo password is always the known value
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { passwordHash: demoHash },
    });
    return { schoolId: existingSchool.id, userId: existingUser.id };
  }

  if (existingSchool) {
    const user = await prisma.user.create({
      data: {
        schoolId: existingSchool.id,
        email: DEMO_EMAIL,
        passwordHash: demoHash,
        fullName: "Demo User",
        role: "SchoolOwner",
      },
    });
    return { schoolId: existingSchool.id, userId: user.id };
  }

  // Full seed in a transaction
  const school = await prisma.school.create({
    data: {
      name: DEMO_SCHOOL_NAME,
      email: "demo@wardbalance.local",
      phone: "+234 800 DEMO 000",
      estimatedStudents: "450",
      address: "42 Demo Avenue, Lagos",
      status: "active",
      selectedPlan: "freemium",
    },
  });

  const user = await prisma.user.create({
    data: {
      schoolId: school.id,
      email: DEMO_EMAIL,
      passwordHash: demoHash,
      fullName: "Demo User",
      role: "SchoolOwner",
    },
  });

  // Academic session & term
  const session = await prisma.academicSession.create({
    data: { schoolId: school.id, name: "2025/2026", isActive: true },
  });

  const term = await prisma.academicTerm.create({
    data: {
      schoolId: school.id,
      sessionId: session.id,
      name: "Second Term",
      status: "active",
      isActive: true,
      startDate: new Date("2026-01-12"),
      endDate: new Date("2026-04-10"),
    },
  });

  // Divisions
  const nursery = await prisma.division.create({ data: { schoolId: school.id, name: "Nursery" } });
  const primary = await prisma.division.create({ data: { schoolId: school.id, name: "Primary" } });
  const secondary = await prisma.division.create({ data: { schoolId: school.id, name: "Secondary" } });

  // Class levels
  const nurseryLevels = await Promise.all(
    ["Nursery 1", "Nursery 2", "Nursery 3"].map((name) =>
      prisma.classLevel.create({ data: { schoolId: school.id, divisionId: nursery.id, name } })
    )
  );

  const primaryLevels = await Promise.all(
    ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"].map((name) =>
      prisma.classLevel.create({ data: { schoolId: school.id, divisionId: primary.id, name } })
    )
  );

  const secondaryLevels = await Promise.all(
    ["JSS 1", "JSS 2", "JSS 3"].map((name) =>
      prisma.classLevel.create({ data: { schoolId: school.id, divisionId: secondary.id, name } })
    )
  );

  const allLevels = [...nurseryLevels, ...primaryLevels, ...secondaryLevels];

  // Class arms
  const classArms: { id: string; classLevelId: string; name: string }[] = [];
  for (const level of allLevels) {
    const a = await prisma.classArm.create({ data: { schoolId: school.id, classLevelId: level.id, name: `${level.name}A` } });
    classArms.push(a);
    const b = await prisma.classArm.create({ data: { schoolId: school.id, classLevelId: level.id, name: `${level.name}B` } });
    classArms.push(b);
  }

  // Students (8 across different levels and arms)
  const studentInputs = [
    { firstName: "Chidi", lastName: "Okonkwo", admission: "DEMO-001", levelIdx: 0, armIdx: 0, gender: "male" },
    { firstName: "Amara", lastName: "Okafor", admission: "DEMO-002", levelIdx: 0, armIdx: 1, gender: "female" },
    { firstName: "Tunde", lastName: "Balogun", admission: "DEMO-003", levelIdx: 3, armIdx: 0, gender: "male" },
    { firstName: "Ngozi", lastName: "Eze", admission: "DEMO-004", levelIdx: 3, armIdx: 1, gender: "female" },
    { firstName: "Kemi", lastName: "Adebayo", admission: "DEMO-005", levelIdx: 5, armIdx: 0, gender: "female" },
    { firstName: "Femi", lastName: "Ogunlesi", admission: "DEMO-006", levelIdx: 7, armIdx: 0, gender: "male" },
    { firstName: "Zainab", lastName: "Bello", admission: "DEMO-007", levelIdx: 7, armIdx: 1, gender: "female" },
    { firstName: "Ifeanyi", lastName: "Okeke", admission: "DEMO-008", levelIdx: 9, armIdx: 0, gender: "male" },
  ];

  const students = await Promise.all(
    studentInputs.map((s) =>
      prisma.student.create({
        data: {
          schoolId: school.id,
          classLevelId: allLevels[s.levelIdx].id,
          classArmId: classArms[s.armIdx].id,
          firstName: s.firstName,
          lastName: s.lastName,
          admissionNumber: s.admission,
          gender: s.gender,
          status: "active",
        },
      })
    )
  );

  // Parents
  const parentInputs = [
    { firstName: "Dr. Emeka", lastName: "Okonkwo", phone: "+234 801 000 0001", email: "emeka.okonkwo@email.com" },
    { firstName: "Mrs. Ada", lastName: "Okafor", phone: "+234 802 000 0002", email: "ada.okafor@email.com" },
    { firstName: "Mr. Tunde", lastName: "Balogun Sr.", phone: "+234 803 000 0003", email: "tunde.balogun@email.com" },
    { firstName: "Mr. Chukwudi", lastName: "Eze", phone: "+234 804 000 0004", email: "chukwudi.eze@email.com" },
    { firstName: "Mrs. Folake", lastName: "Adebayo", phone: "+234 805 000 0005", email: "folake.adebayo@email.com" },
    { firstName: "Mr. Kayode", lastName: "Ogunlesi", phone: "+234 806 000 0006", email: "kayode.ogunlesi@email.com" },
  ];

  const parents = await Promise.all(
    parentInputs.map((p) =>
      prisma.parent.create({
        data: { schoolId: school.id, firstName: p.firstName, lastName: p.lastName, phone: p.phone, email: p.email },
      })
    )
  );

  // Parent-ward links
  const links = [
    { parentIdx: 0, studentIdx: 0, relationship: "Father" as const },
    { parentIdx: 1, studentIdx: 1, relationship: "Mother" as const },
    { parentIdx: 2, studentIdx: 2, relationship: "Father" as const },
    { parentIdx: 3, studentIdx: 3, relationship: "Father" as const },
    { parentIdx: 4, studentIdx: 4, relationship: "Mother" as const },
    { parentIdx: 5, studentIdx: 5, relationship: "Father" as const },
    { parentIdx: 5, studentIdx: 6, relationship: "Father" as const },
  ];

  for (const link of links) {
    await prisma.parentWardLink.create({
      data: {
        schoolId: school.id,
        parentId: parents[link.parentIdx].id,
        studentId: students[link.studentIdx].id,
        relationshipType: link.relationship,
        isPrimaryContact: true,
        receivesInvoiceNotifications: true,
      },
    });
  }

  // Fee items
  const feeItems = await Promise.all([
    prisma.feeItem.create({ data: { schoolId: school.id, name: "Tuition Fee", type: "mandatory", billingFrequency: "per_term", amount: new Prisma.Decimal("150000.00") } }),
    prisma.feeItem.create({ data: { schoolId: school.id, name: "Development Levy", type: "mandatory", billingFrequency: "per_session", amount: new Prisma.Decimal("25000.00") } }),
    prisma.feeItem.create({ data: { schoolId: school.id, name: "ICT Fee", type: "mandatory", billingFrequency: "per_term", amount: new Prisma.Decimal("15000.00") } }),
    prisma.feeItem.create({ data: { schoolId: school.id, name: "Textbooks & Materials", type: "mandatory", billingFrequency: "per_term", amount: new Prisma.Decimal("35000.00") } }),
    prisma.feeItem.create({ data: { schoolId: school.id, name: "PTA Levy", type: "mandatory", billingFrequency: "per_term", amount: new Prisma.Decimal("5000.00") } }),
    prisma.feeItem.create({ data: { schoolId: school.id, name: "Examination Fee", type: "mandatory", billingFrequency: "per_term", amount: new Prisma.Decimal("8000.00") } }),
    prisma.feeItem.create({ data: { schoolId: school.id, name: "Sports & Extracurricular", type: "mandatory", billingFrequency: "per_term", amount: new Prisma.Decimal("10000.00") } }),
    prisma.feeItem.create({ data: { schoolId: school.id, name: "Transport Fee", type: "optional", billingFrequency: "per_term", amount: new Prisma.Decimal("30000.00") } }),
    prisma.feeItem.create({ data: { schoolId: school.id, name: "After-School Care", type: "optional", billingFrequency: "per_term", amount: new Prisma.Decimal("20000.00") } }),
    prisma.feeItem.create({ data: { schoolId: school.id, name: "STEM Club", type: "optional", billingFrequency: "per_term", amount: new Prisma.Decimal("12000.00") } }),
  ]);

  // Class fee templates: Primary 1 and JSS 1
  const templateLevelIndices = [3, 7];
  const mandatoryFeeItemIds = feeItems.slice(0, 7).map((f) => f.id);

  for (const levelIdx of templateLevelIndices) {
    const template = await prisma.classFeeTemplate.create({
      data: {
        schoolId: school.id,
        classLevelId: allLevels[levelIdx].id,
        termId: term.id,
        status: "published",
      },
    });

    for (const feeItemId of mandatoryFeeItemIds) {
      await prisma.classFeeTemplateItem.create({
        data: { templateId: template.id, feeItemId },
      });
    }
  }

  // Invoices for the 4 students in Primary 1 and JSS 1
  const invoiceStudents = [students[2], students[3], students[5]];
  const totalAmount = new Prisma.Decimal("248000.00");

  interface InvoiceSeed {
    studentIdx: number;
    status: "paid" | "partial" | "overdue";
    amountPaid: Prisma.Decimal;
    paymentMethod: "bank_transfer" | "cash";
    paymentRef: string | null;
  }

  const invoiceSeeds: InvoiceSeed[] = [
    { studentIdx: 0, status: "paid", amountPaid: totalAmount, paymentMethod: "bank_transfer", paymentRef: "TRF-DEMO-001" },
    { studentIdx: 1, status: "partial", amountPaid: new Prisma.Decimal("150000.00"), paymentMethod: "cash", paymentRef: null },
    { studentIdx: 2, status: "overdue", amountPaid: new Prisma.Decimal("0"), paymentMethod: "bank_transfer", paymentRef: null },
  ];

  for (const seed of invoiceSeeds) {
    const student = invoiceStudents[seed.studentIdx];
    const balanceDue = totalAmount.minus(seed.amountPaid);

    const tpl = await prisma.classFeeTemplate.findFirst({
      where: { schoolId: school.id, classLevelId: student.classLevelId, termId: term.id },
    });

    const invoice = await prisma.invoice.create({
      data: {
        schoolId: school.id,
        studentId: student.id,
        termId: term.id,
        templateId: tpl?.id ?? null,
        status: seed.status,
        dueDate: new Date("2026-02-15"),
        totalAmount,
        discountAmount: new Prisma.Decimal("0"),
        finalAmount: totalAmount,
        amountPaid: seed.amountPaid,
        balanceDue,
      },
    });

    for (const feeItem of feeItems.slice(0, 7)) {
      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          feeItemId: feeItem.id,
          name: feeItem.name,
          amount: feeItem.amount,
          lineType: "fee_item",
        },
      });
    }

    if (seed.status === "paid" || seed.status === "partial") {
      const payment = await prisma.payment.create({
        data: {
          schoolId: school.id,
          invoiceId: invoice.id,
          studentId: student.id,
          parentId: parents[seed.studentIdx < parents.length ? seed.studentIdx : 0].id,
          amount: seed.amountPaid,
          method: seed.paymentMethod,
          status: "recorded",
          recordedById: user.id,
          reference: seed.paymentRef,
        },
      });

      await prisma.receipt.create({
        data: {
          schoolId: school.id,
          paymentId: payment.id,
          receiptNumber: `RCT-DEMO-${String(seed.studentIdx + 1).padStart(4, "0")}`,
        },
      });

      await prisma.auditLog.create({
        data: {
          schoolId: school.id,
          actorId: user.id,
          actorName: "Demo User",
          action: "payment.recorded",
          entityType: "Payment",
          entityId: payment.id,
          newValue: { amount: seed.amountPaid.toNumber(), method: seed.paymentMethod },
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        schoolId: school.id,
        actorId: user.id,
        actorName: "Demo User",
        action: "invoice.generated",
        entityType: "Invoice",
        entityId: invoice.id,
        newValue: { status: seed.status, totalAmount: totalAmount.toNumber(), finalAmount: totalAmount.toNumber() },
      },
    });
  }

  return { schoolId: school.id, userId: user.id };
}
