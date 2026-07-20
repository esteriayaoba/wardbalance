import { prisma } from "@/lib/prisma";

export type PlanLimitType = "maxStudents" | "maxStaff" | "maxWorkspaces" | "paymentMethods" | "reports";

export interface PlanEnforcementResult {
  allowed: boolean;
  error?: {
    code: "PLAN_LIMIT_EXCEEDED" | "SUBSCRIPTION_SUSPENDED" | "SUBSCRIPTION_EXPIRED";
    message: string;
    limit: string;
  };
}

const SUSPENDED_STATUSES = ["suspended", "expired"];

/**
 * Check if a school's subscription allows the action.
 * Returns { allowed: false, error } with a structured error if the action is blocked.
 */
export async function enforcePlanLimit(
  schoolId: string,
  limitType: PlanLimitType,
  currentUsage?: number,
): Promise<PlanEnforcementResult> {
  const subscription = await prisma.schoolSubscription.findUnique({
    where: { schoolId },
    include: { plan: true },
  });

  if (!subscription || SUSPENDED_STATUSES.includes(subscription.status)) {
    const status = subscription?.status ?? "no_subscription";
    return {
      allowed: false,
      error: {
        code: status === "expired" ? "SUBSCRIPTION_EXPIRED" : "SUBSCRIPTION_SUSPENDED",
        message:
          status === "expired"
            ? "Your subscription has expired. Renew to continue using all features."
            : "Your subscription is suspended. Resolve the outstanding payment to continue.",
        limit: limitType,
      },
    };
  }

  const limits = subscription.plan.limits as Record<string, unknown>;
  const limit = limits[limitType] as number | undefined;

  // No limit set (e.g. Group plan with -1) — allow
  if (limit === undefined || limit === -1) {
    return { allowed: true };
  }

  if (currentUsage !== undefined && currentUsage >= limit) {
    return {
      allowed: false,
      error: {
        code: "PLAN_LIMIT_EXCEEDED",
        message: `You have reached the ${limitType.replace(/([A-Z])/g, " $1").toLowerCase()} limit for your ${subscription.plan.name} plan (${limit}). Upgrade to add more.`,
        limit: limitType,
      },
    };
  }

  return { allowed: true };
}

/**
 * Quick check — throws a structured API error if the limit is exceeded.
 * For use inside API routes.
 */
export async function requirePlanLimit(
  schoolId: string,
  limitType: PlanLimitType,
  currentUsage?: number,
): Promise<void> {
  const result = await enforcePlanLimit(schoolId, limitType, currentUsage);
  if (!result.allowed) {
    const error = new Error(result.error!.message) as Error & { code: string; statusCode: number; limit: string };
    error.code = result.error!.code;
    error.statusCode = 403;
    error.limit = result.error!.limit;
    throw error;
  }
}

/**
 * Get current usage counts for a school.
 * Used to pass to enforcePlanLimit / requirePlanLimit.
 */
export async function getSchoolUsage(schoolId: string) {
  const [studentCount, staffCount] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId } }),
  ]);

  return {
    maxStudents: studentCount,
    maxStaff: staffCount,
  };
}
