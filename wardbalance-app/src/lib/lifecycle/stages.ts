import { getMilestones } from "./events";

export type LifecycleStage =
  | "NEW"
  | "ONBOARDING"
  | "ACTIVATING"
  | "ACTIVE"
  | "AT_RISK"
  | "DORMANT";

const milestoneKeys = [
  "account_created",
  "school_created",
  "setup_wizard_started",
  "setup_completed",
  "academic_session_created",
  "classes_created",
  "students_imported",
  "parents_linked",
  "fee_library_created",
  "first_invoice_generated",
  "first_payment_recorded",
  "first_parent_payment",
  "school_active",
] as const;

export async function evaluateStage(
  schoolId: string,
  daysSinceLastLogin: number,
): Promise<LifecycleStage> {
  const events = await getMilestones(schoolId);
  const completed = new Set(events.map((e) => e.milestone));

  if (completed.has("school_active")) {
    if (daysSinceLastLogin >= 60) return "DORMANT";
    if (daysSinceLastLogin >= 30) return "AT_RISK";
    return "ACTIVE";
  }

  if (completed.has("first_invoice_generated")) return "ACTIVATING";

  if (completed.has("setup_completed") || completed.has("setup_wizard_started")) {
    return "ONBOARDING";
  }

  return "NEW";
}
