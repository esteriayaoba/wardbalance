import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function computeStatus(
  isCompleted: boolean,
  isBlocked: boolean,
  hasInvoices: boolean,
  hasStudentsWithoutParents: boolean,
  hasFeeItemsWithoutTemplates: boolean,
): "completed" | "not_started" | "blocked" | "in_progress" | "needs_attention" {
  if (isCompleted) {
    if (hasInvoices && hasFeeItemsWithoutTemplates) return "needs_attention";
    if (hasStudentsWithoutParents) return "needs_attention";
    return "completed";
  }
  if (isBlocked) return "blocked";
  return "not_started";
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const schoolId = session.schoolId;

    // Fetch school
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return NextResponse.json(
        { error: "School not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Fetch database counts to determine checklist states
    const [
      sessionCount,
      termCount,
      divisionCount,
      levelCount,
      armCount,
      studentCount,
      parentCount,
      linkCount,
      feeItemCount,
      templateCount,
      invoiceCount,
      studentsWithoutParentsCount,
    ] = await Promise.all([
      prisma.academicSession.count({ where: { schoolId } }),
      prisma.academicTerm.count({ where: { schoolId } }),
      prisma.division.count({ where: { schoolId } }),
      prisma.classLevel.count({ where: { schoolId } }),
      prisma.classArm.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId } }),
      prisma.parent.count({ where: { schoolId } }),
      prisma.parentWardLink.count({ where: { schoolId } }),
      prisma.feeItem.count({ where: { schoolId } }),
      prisma.classFeeTemplate.count({ where: { schoolId } }),
      prisma.invoice.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId, parents: { none: {} } } }),
    ]);

    const hasFeeItemsWithoutTemplates = feeItemCount > 0 && templateCount === 0 && invoiceCount > 0;

    const isProfileComplete = !!(school.address && school.phone);

    // Step Status Determinations
    const step1 = {
      id: 1,
      title: "Complete school profile",
      description: "Set up the school address, telephone, and basic information.",
      status: computeStatus(isProfileComplete, false, false, false, false),
      blocked: false,
      blockedBy: [] as string[],
      cta: "Edit Profile",
      href: "/admin/settings",
    };

    const step2 = {
      id: 2,
      title: "Create academic session",
      description: "Define the school academic session calendar (e.g. 2026/2027).",
      status: computeStatus(sessionCount > 0, false, false, false, false),
      blocked: false,
      blockedBy: [] as string[],
      cta: "Add Session",
      href: "/admin/academic?tab=sessions",
    };

    const isTermBlocked = sessionCount === 0;
    const step3 = {
      id: 3,
      title: "Create academic term",
      description: "Define active terms under the academic session (e.g. First Term).",
      status: computeStatus(termCount > 0, isTermBlocked, false, false, false),
      blocked: isTermBlocked,
      blockedBy: isTermBlocked ? ["Academic Session"] : [],
      cta: "Add Term",
      href: "/admin/academic?tab=terms",
    };

    const step4 = {
      id: 4,
      title: "Create divisions",
      description: "Define educational divisions in the school (e.g. Primary, Secondary).",
      status: computeStatus(divisionCount > 0, false, false, false, false),
      blocked: false,
      blockedBy: [] as string[],
      cta: "Add Divisions",
      href: "/admin/academic?tab=divisions",
    };

    const isLevelBlocked = divisionCount === 0;
    const step5 = {
      id: 5,
      title: "Create class levels",
      description: "Create levels within each educational division (e.g. Primary 1, JSS1).",
      status: computeStatus(levelCount > 0, isLevelBlocked, false, false, false),
      blocked: isLevelBlocked,
      blockedBy: isLevelBlocked ? ["Divisions"] : [],
      cta: "Add Levels",
      href: "/admin/academic?tab=levels",
    };

    const isArmBlocked = levelCount === 0;
    const step6 = {
      id: 6,
      title: "Create class arms",
      description: "Add individual arms to each class level (e.g. Primary 1A, JSS1 Gold).",
      status: computeStatus(armCount > 0, isArmBlocked, false, false, false),
      blocked: isArmBlocked,
      blockedBy: isArmBlocked ? ["Class Levels"] : [],
      cta: "Add Arms",
      href: "/admin/academic?tab=arms",
    };

    const isStudentBlocked = armCount === 0;
    const step7 = {
      id: 7,
      title: "Add or import students",
      description: "Register students into class arms manually or upload a CSV file.",
      status: computeStatus(studentCount > 0, isStudentBlocked, false, false, false),
      blocked: isStudentBlocked,
      blockedBy: isStudentBlocked ? ["Class Arms"] : [],
      cta: "Register Students",
      href: "/admin/students",
    };

    const isParentBlocked = studentCount === 0;
    const step8 = {
      id: 8,
      title: "Add or import parents",
      description: "Register parents details to setup payment notifications channels.",
      status: computeStatus(parentCount > 0, isParentBlocked, false, false, false),
      blocked: isParentBlocked,
      blockedBy: isParentBlocked ? ["Students"] : [],
      cta: "Register Parents",
      href: "/admin/parents",
    };

    const isLinkBlocked = parentCount === 0 || studentCount === 0;
    const needsLinkAttention = linkCount === 0 && studentCount > 0 && parentCount > 0 && invoiceCount > 0;
    const step9 = {
      id: 9,
      title: "Link parents to wards",
      description: "Link parental profiles to students for invoice delivery and bills tracking.",
      status: computeStatus(linkCount > 0, isLinkBlocked, false, studentsWithoutParentsCount > 0, false),
      blocked: isLinkBlocked,
      blockedBy: isLinkBlocked ? ["Parents", "Students"] : [],
      cta: "Link Wards",
      href: "/admin/students",
    };

    const step10 = {
      id: 10,
      title: "Create fee items",
      description: "Define library items of billing charges (e.g. Tuition, Development Levy).",
      status: computeStatus(feeItemCount > 0, false, false, false, false),
      blocked: false,
      blockedBy: [] as string[],
      cta: "Create Fees Library",
      href: "/admin/fees?tab=library",
    };

    const isTemplateBlocked = termCount === 0 || levelCount === 0 || feeItemCount === 0;
    const needsTemplateAttention = templateCount === 0 && feeItemCount > 0 && invoiceCount > 0;
    const step11 = {
      id: 11,
      title: "Create class fee templates",
      description: "Define mandatory fee templates for specific term + level cohorts.",
      status: needsTemplateAttention ? "needs_attention" : computeStatus(templateCount > 0, isTemplateBlocked, false, false, false),
      blocked: isTemplateBlocked,
      blockedBy: isTemplateBlocked ? ["Academic Term", "Class Levels", "Fee Items"] : [],
      cta: "Build Templates",
      href: "/admin/fees?tab=templates",
    };

    const isInvoiceBlocked = templateCount === 0 || studentCount === 0;
    const step12 = {
      id: 12,
      title: "Generate first invoices",
      description: "Run the bulk billing engine to dispatch terms invoices to classrooms.",
      status: computeStatus(invoiceCount > 0, isInvoiceBlocked, false, false, false),
      blocked: isInvoiceBlocked,
      blockedBy: isInvoiceBlocked ? ["Fee Templates", "Students"] : [],
      cta: "Run Billing Wizard",
      href: "/admin/invoices?action=new",
    };

    const steps = [
      step1,
      step2,
      step3,
      step4,
      step5,
      step6,
      step7,
      step8,
      step9,
      step10,
      step11,
      step12,
    ];

    const completedCount = steps.filter((s) => s.status === "completed").length;
    const totalCount = steps.length;
    const isSetupComplete = completedCount === totalCount;

    return NextResponse.json({
      data: {
        steps,
        progress: {
          completed: completedCount,
          total: totalCount,
          percentage: Math.round((completedCount / totalCount) * 100),
        },
        schoolStatus: school.status,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("[setup] Resolver error:", err);
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
