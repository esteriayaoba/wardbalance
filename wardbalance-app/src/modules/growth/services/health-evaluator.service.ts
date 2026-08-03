import { prisma } from "@/lib/prisma";
import {
  HEALTH_SIGNAL_WEIGHTS,
  HEALTH_TIERS,
  type HealthTier,
} from "../config/health-config";

export interface HealthSignal {
  name: string;
  score: number;   // 0–100
  weight: number;  // sourced from health-config.ts
  detail: string;  // human-readable explanation
}

export interface SchoolHealthReport {
  schoolId: string;
  schoolName: string;
  compositeScore: number;
  tier: HealthTier;
  tierLabel: string;
  signals: HealthSignal[];
  evaluatedAt: Date;
}

export class SchoolHealthEvaluator {
  /**
   * Evaluates the health of a single school by computing
   * weighted signals from config. Weights are fully configurable
   * via src/modules/growth/config/health-config.ts.
   */
  static async evaluate(schoolId: string): Promise<SchoolHealthReport> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        subscription: { include: { plan: true } },
        invoices: { where: { status: "overdue" }, select: { id: true } },
        classArms: { select: { id: true } },
        students: { select: { id: true } },
        payments: { select: { id: true } },
      },
    });

    if (!school) throw new Error(`School ${schoolId} not found`);

    const sevenDaysAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const threeDaysAgo  = new Date(Date.now() - 3  * 24 * 60 * 60 * 1000);

    // --- Signal: Login Recency ---
    const lastLogin = await prisma.auditLog.findFirst({
      where: {
        schoolId,
        action: { in: ["auth.login", "auth.email_verified"] },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    let loginScore = 0;
    let loginDetail = "Never logged in";
    if (lastLogin) {
      const loginAge = Date.now() - lastLogin.createdAt.getTime();
      const days = loginAge / (1000 * 60 * 60 * 24);
      if (days < 3)       { loginScore = 100; loginDetail = "Last login < 3 days ago"; }
      else if (days < 7)  { loginScore = 75;  loginDetail = "Last login < 7 days ago"; }
      else if (days < 14) { loginScore = 40;  loginDetail = "Last login < 14 days ago"; }
      else                { loginScore = 0;   loginDetail = `Last login ${Math.round(days)} days ago`; }
    }

    // --- Signal: Onboarding Progress ---
    // 6 key milestone checks: has division, class, student, fee item, invoice, payment
    const [hasDivision, hasClassArm, hasStudent, hasFeeItem, hasInvoice, hasPayment] =
      await Promise.all([
        prisma.division.count({ where: { schoolId } }),
        prisma.classArm.count({ where: { schoolId } }),
        prisma.student.count({ where: { schoolId } }),
        prisma.feeItem.count({ where: { schoolId } }),
        prisma.invoice.count({ where: { schoolId } }),
        prisma.payment.count({ where: { schoolId } }),
      ]);

    const milestones = [hasDivision, hasClassArm, hasStudent, hasFeeItem, hasInvoice, hasPayment]
      .filter(Boolean).length;
    const onboardingScore = Math.round((milestones / 6) * 100);
    const onboardingDetail = `${milestones}/6 setup milestones completed`;

    // --- Signal: Subscription Status ---
    const sub = school.subscription;
    let subScore = 0;
    let subDetail = "No subscription";
    if (sub) {
      switch (sub.status) {
        case "active":    subScore = 100; subDetail = "Active subscription";      break;
        case "trialing":  subScore = 60;  subDetail = "Trial in progress";         break;
        case "past_due":  subScore = 30;  subDetail = "Subscription past due";     break;
        case "suspended": subScore = 15;  subDetail = "Subscription suspended";    break;
        default:          subScore = 0;   subDetail = `Status: ${sub.status}`;    break;
      }
    }

    // --- Signal: Overdue Invoices ---
    const overdueCount = school.invoices.length;
    let overdueScore = 100;
    let overdueDetail = "No overdue invoices";
    if (overdueCount === 1) { overdueScore = 60; overdueDetail = "1 overdue invoice"; }
    else if (overdueCount === 2) { overdueScore = 30; overdueDetail = "2 overdue invoices"; }
    else if (overdueCount >= 3)  { overdueScore = 0;  overdueDetail = `${overdueCount} overdue invoices`; }

    // --- Signal: Feature Adoption ---
    const adoptionFactors = [
      school.classArms.length > 0,
      school.students.length > 0,
      school.payments.length > 0,
      hasInvoice > 0,
    ];
    const adoptionScore = Math.round((adoptionFactors.filter(Boolean).length / adoptionFactors.length) * 100);
    const adoptionDetail = `${adoptionFactors.filter(Boolean).length}/4 core features used`;

    // --- Signal: Recent Activity (Audit Log) ---
    const recentActivityCount = await prisma.auditLog.count({
      where: {
        schoolId,
        createdAt: { gte: sevenDaysAgo },
      },
    });
    const activityScore = Math.min(100, Math.round((recentActivityCount / 5) * 100));
    const activityDetail = `${recentActivityCount} actions in last 7 days`;

    // --- Compute Composite Score ---
    const signals: HealthSignal[] = [
      { name: "Login Recency",       score: loginScore,       weight: HEALTH_SIGNAL_WEIGHTS.loginRecency,       detail: loginDetail },
      { name: "Onboarding Progress", score: onboardingScore,  weight: HEALTH_SIGNAL_WEIGHTS.onboardingProgress, detail: onboardingDetail },
      { name: "Subscription Status", score: subScore,         weight: HEALTH_SIGNAL_WEIGHTS.subscriptionStatus, detail: subDetail },
      { name: "Overdue Invoices",    score: overdueScore,     weight: HEALTH_SIGNAL_WEIGHTS.overdueInvoices,    detail: overdueDetail },
      { name: "Feature Adoption",    score: adoptionScore,    weight: HEALTH_SIGNAL_WEIGHTS.featureAdoption,    detail: adoptionDetail },
      { name: "Recent Activity",     score: activityScore,    weight: HEALTH_SIGNAL_WEIGHTS.recentActivity,     detail: activityDetail },
    ];

    const compositeScore = Math.round(
      signals.reduce((sum, s) => sum + s.score * s.weight, 0)
    );

    // --- Determine Tier from Config ---
    let tier: HealthTier = "inactive";
    for (const [key, bounds] of Object.entries(HEALTH_TIERS) as [HealthTier, { min: number; label: string }][]) {
      if (compositeScore >= bounds.min) {
        tier = key;
        break;
      }
    }

    return {
      schoolId,
      schoolName: school.name,
      compositeScore,
      tier,
      tierLabel: HEALTH_TIERS[tier].label,
      signals,
      evaluatedAt: new Date(),
    };
  }

  /**
   * Evaluates health for all active schools and returns
   * a distribution count by tier (for dashboard display).
   */
  static async getHealthDistribution(): Promise<{
    healthy: number;
    needs_attention: number;
    at_risk: number;
    inactive: number;
    schools: SchoolHealthReport[];
  }> {
    const schools = await prisma.school.findMany({
      where: { status: { in: ["active", "onboarding", "invited"] } },
      select: { id: true },
    });

    const reports = await Promise.all(
      schools.map((s) => this.evaluate(s.id).catch(() => null))
    );

    const valid = reports.filter((r): r is SchoolHealthReport => r !== null);

    return {
      healthy:         valid.filter((r) => r.tier === "healthy").length,
      needs_attention: valid.filter((r) => r.tier === "needs_attention").length,
      at_risk:         valid.filter((r) => r.tier === "at_risk").length,
      inactive:        valid.filter((r) => r.tier === "inactive").length,
      schools: valid,
    };
  }
}
