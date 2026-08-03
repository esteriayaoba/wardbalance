import { prisma } from "@/lib/prisma";
import { SchoolHealthEvaluator } from "./health-evaluator.service";

export class JourneyTriggerService {
  /**
   * Scans all active journeys and enrolls qualifying leads or school admin contacts.
   */
  static async scanAndEnroll(): Promise<{ enrolledCount: number; journeysScanned: number }> {
    const activeJourneys = await prisma.journey.findMany({
      where: { isActive: true },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });

    let totalEnrolled = 0;

    for (const journey of activeJourneys) {
      if (journey.steps.length === 0) continue;

      const candidates = await this.resolveCandidatesForTrigger(journey.trigger);

      for (const candidate of candidates) {
        if (!candidate.email) continue;

        const emailLower = candidate.email.toLowerCase().trim();

        // Calculate nextStepAt based on the first step's delay
        const firstStep = journey.steps[0];
        const delayDays = firstStep?.delayDays || 0;
        const nextStepAt = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);

        try {
          // Idempotent upsert via unique constraint (journeyId, contactEmail)
          await prisma.journeyEnrollment.upsert({
            where: {
              journeyId_contactEmail: {
                journeyId: journey.id,
                contactEmail: emailLower,
              },
            },
            create: {
              journeyId: journey.id,
              schoolId: candidate.schoolId || null,
              leadId: candidate.leadId || null,
              contactEmail: emailLower,
              currentStep: 0,
              status: "ACTIVE",
              enrolledAt: new Date(),
              nextStepAt,
            },
            update: {}, // No-op if already enrolled
          });

          totalEnrolled++;
        } catch (err) {
          // Ignore duplicate constraint or transient errors
          console.error(`[journey-trigger] Enrollment error for ${emailLower}:`, err);
        }
      }
    }

    return { enrolledCount: totalEnrolled, journeysScanned: activeJourneys.length };
  }

  /**
   * Resolves target contacts based on trigger type.
   */
  private static async resolveCandidatesForTrigger(
    trigger: string
  ): Promise<Array<{ email: string; schoolId?: string; leadId?: string }>> {
    const results: Array<{ email: string; schoolId?: string; leadId?: string }> = [];

    switch (trigger) {
      case "NEW_LEAD": {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const leads = await prisma.lead.findMany({
          where: {
            status: "new",
            createdAt: { gte: twentyFourHoursAgo },
          },
          select: { id: true, email: true },
        });

        for (const l of leads) {
          results.push({ email: l.email, leadId: l.id });
        }
        break;
      }

      case "TRIAL_EXPIRING_3D": {
        const today = new Date();
        const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        const schools = await prisma.school.findMany({
          where: {
            trialEndsAt: { gte: today, lte: threeDaysFromNow },
            subscription: null,
          },
          select: { id: true, email: true },
        });

        for (const s of schools) {
          if (s.email) {
            results.push({ email: s.email, schoolId: s.id });
          }
        }
        break;
      }

      case "INACTIVE_7D": {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const activeSchools = await prisma.school.findMany({
          where: { status: "active" },
          select: { id: true, email: true },
        });

        for (const s of activeSchools) {
          if (!s.email) continue;
          const recentLog = await prisma.auditLog.findFirst({
            where: {
              schoolId: s.id,
              createdAt: { gte: sevenDaysAgo },
            },
          });
          if (!recentLog) {
            results.push({ email: s.email, schoolId: s.id });
          }
        }
        break;
      }

      case "HEALTH_AT_RISK": {
        const activeSchools = await prisma.school.findMany({
          where: { status: "active" },
          select: { id: true, email: true },
        });

        for (const s of activeSchools) {
          if (!s.email) continue;
          const evalResult = await SchoolHealthEvaluator.evaluateSchoolHealth(s.id);
          if (evalResult.tier === "at_risk" || evalResult.tier === "inactive") {
            results.push({ email: s.email, schoolId: s.id });
          }
        }
        break;
      }

      case "ONBOARDING_STALLED": {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const stalled = await prisma.school.findMany({
          where: {
            status: "onboarding",
            createdAt: { lte: sevenDaysAgo },
          },
          select: { id: true, email: true },
        });

        for (const s of stalled) {
          if (s.email) {
            results.push({ email: s.email, schoolId: s.id });
          }
        }
        break;
      }

      default:
        break;
    }

    return results;
  }
}
