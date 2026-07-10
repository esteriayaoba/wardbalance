import { prisma } from "@/lib/prisma";

export type Milestone =
  | "account_created"
  | "school_created"
  | "setup_wizard_started"
  | "setup_completed"
  | "academic_session_created"
  | "classes_created"
  | "students_imported"
  | "parents_linked"
  | "fee_library_created"
  | "first_invoice_generated"
  | "first_payment_recorded"
  | "first_parent_payment"
  | "school_active";

export async function recordMilestone(
  schoolId: string,
  userId: string,
  milestone: Milestone,
  metadata?: Record<string, unknown>,
) {
  await prisma.lifecycleEvent.create({
    data: {
      schoolId,
      userId,
      milestone,
      metadata: (metadata ?? {}) as any,
    },
  });
}

export async function hasMilestone(
  schoolId: string,
  milestone: Milestone,
): Promise<boolean> {
  const count = await prisma.lifecycleEvent.count({
    where: { schoolId, milestone },
  });
  return count > 0;
}

export async function getMilestones(schoolId: string) {
  const events = await prisma.lifecycleEvent.findMany({
    where: { schoolId },
    orderBy: { occurredAt: "asc" },
    select: { milestone: true, occurredAt: true, metadata: true },
  });
  return events;
}
