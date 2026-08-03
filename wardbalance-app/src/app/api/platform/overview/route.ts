import { requirePlatformRole } from "@/lib/auth/require-platform-role";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { CampaignAudienceResolver } from "@/modules/growth/services/audience-resolver.service";
import { SchoolHealthEvaluator } from "@/modules/growth/services/health-evaluator.service";

export async function GET() {
  const auth = await requirePlatformRole(["PlatformAdmin", "Marketing", "CustomerSuccess", "Support"]);
  if (!auth.authorized) return auth.response;

  try {
    const today = new Date();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // 1. Core KPIs
    const newLeadsCount = await prisma.lead.count({ where: { status: "new" } });
    const demoRequestsCount = await prisma.lead.count({ where: { status: { not: "converted" } } });
    const registeredSchoolsCount = await prisma.school.count({ where: { status: "invited" } });
    const onboardingSchoolsCount = await prisma.school.count({ where: { status: "onboarding" } });
    const activeSchoolsCount = await prisma.school.count({ where: { status: "active" } });

    // Trial schools
    const trialSchoolsCount = await prisma.school.count({
      where: {
        trialEndsAt: { gte: today },
        subscription: null,
      },
    });

    // Paying schools
    const payingSchoolsCount = await prisma.schoolSubscription.count({
      where: { status: "active" },
    });

    // Trials expiring this week
    const trialExpiringThisWeekCount = await prisma.school.count({
      where: {
        trialEndsAt: { gte: today, lte: sevenDaysFromNow },
      },
    });

    // Calculate MRR
    const activeSubs = await prisma.schoolSubscription.findMany({
      where: { status: "active" },
      include: { plan: true },
    });
    
    let mrrTotal = 0;
    for (const sub of activeSubs) {
      const price = Number(sub.plan.price);
      if (sub.plan.billingPeriod === "term") {
        mrrTotal += price / 3;
      } else {
        mrrTotal += price;
      }
    }

    // 2. Health Distribution (Dynamic from Signal Engine)
    const healthData = await SchoolHealthEvaluator.getHealthDistribution();

    // 3. 30-Day Growth Trends (Chronological)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const leadsPast30Days = await prisma.lead.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });
    const schoolsPast30Days = await prisma.school.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    // Build day-by-day maps
    const trendsMap: Record<string, { date: string; newLeads: number; newConversions: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateString = date.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
      const dayKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
      trendsMap[dayKey] = { date: dateString, newLeads: 0, newConversions: 0 };
    }

    for (const l of leadsPast30Days) {
      const key = l.createdAt.toISOString().split("T")[0];
      if (trendsMap[key]) {
        trendsMap[key].newLeads++;
      }
    }
    for (const s of schoolsPast30Days) {
      const key = s.createdAt.toISOString().split("T")[0];
      if (trendsMap[key]) {
        trendsMap[key].newConversions++;
      }
    }

    const growthTrends = Object.keys(trendsMap)
      .sort()
      .map((key) => trendsMap[key]);

    // 4. Priority-Ranked Actionable Insights
    const neverCreatedClassCount = (await CampaignAudienceResolver.resolveSegment("NEVER_CREATED_CLASS")).length;
    const neverCreatedInvoiceCount = (await CampaignAudienceResolver.resolveSegment("NEVER_CREATED_INVOICE")).length;
    const trialExpiringCount = (await CampaignAudienceResolver.resolveSegment("TRIAL_EXPIRING")).length;

    // Helper to calculate priorities
    const insights: any[] = [];

    if (trialExpiringCount > 0) {
      const isCritical = trialExpiringCount >= 3;
      insights.push({
        id: "insight_trial_expiring",
        priority: isCritical ? "critical" : "high",
        title: isCritical ? "Critical Trial Expirations" : "Imminent Trial Expirations",
        description: `${trialExpiringCount} school(s) have free trials expiring in the next 3 days.`,
        businessImpact: `${trialExpiringCount} school(s) may churn this week without a subscription upgrade.`,
        suggestedAction: "Send Trial Ending Reminder Drip",
        suggestedCampaign: {
          templateCategory: "trial_ending",
          segment: "TRIAL_EXPIRING",
        },
        affectedCount: trialExpiringCount,
      });
    }

    if (healthData.at_risk > 0) {
      const isCritical = healthData.at_risk > 5;
      insights.push({
        id: "insight_at_risk_schools",
        priority: isCritical ? "critical" : "high",
        title: "At-Risk School Portals Detected",
        description: `${healthData.at_risk} active school(s) exhibit extremely low health indicators.`,
        businessImpact: "Risk of school abandonment or negative customer satisfaction.",
        suggestedAction: "Send Customer Care Win-back Outreach",
        suggestedCampaign: {
          templateCategory: "win_back",
          segment: "INACTIVE_SCHOOLS",
        },
        affectedCount: healthData.at_risk,
      });
    }

    if (neverCreatedInvoiceCount > 0) {
      insights.push({
        id: "insight_never_created_invoice",
        priority: "high",
        title: "Invoicing Checklist Incomplete",
        description: `${neverCreatedInvoiceCount} school(s) setup is complete but they haven't invoiced parents.`,
        businessImpact: "Schools are not actively transacting or seeing platform value.",
        suggestedAction: "Send Invoice Creation Checklist Nudge",
        suggestedCampaign: {
          templateCategory: "invoice_reminder",
          segment: "NEVER_CREATED_INVOICE",
        },
        affectedCount: neverCreatedInvoiceCount,
      });
    }

    if (neverCreatedClassCount > 0) {
      insights.push({
        id: "insight_never_created_class",
        priority: "medium",
        title: "Milestone Warning: No Classes",
        description: `${neverCreatedClassCount} registered school(s) have not created a Class Arm.`,
        businessImpact: "Stalled onboarding prevents student records initialization.",
        suggestedAction: "Send Onboarding Getting Started Guide",
        suggestedCampaign: {
          templateCategory: "onboarding",
          segment: "NEVER_CREATED_CLASS",
        },
        affectedCount: neverCreatedClassCount,
      });
    }

    if (newLeadsCount > 0) {
      insights.push({
        id: "insight_new_leads",
        priority: "medium",
        title: "New Funnel Leads Unaddressed",
        description: `${newLeadsCount} landing page prospect(s) require onboarding invites.`,
        businessImpact: "Lead conversion drop-offs due to delayed response times.",
        suggestedAction: "Send Welcome Invite Sequence",
        suggestedCampaign: {
          templateCategory: "welcome",
          segment: "NEW_LEADS",
        },
        affectedCount: newLeadsCount,
      });
    }

    // Sort: critical > high > medium > low
    const priorityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    insights.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    return NextResponse.json({
      kpis: {
        newLeads: newLeadsCount,
        demoRequests: demoRequestsCount,
        registeredSchools: registeredSchoolsCount,
        onboardingSchools: onboardingSchoolsCount,
        activeSchools: activeSchoolsCount,
        trialSchools: trialSchoolsCount,
        payingSchools: payingSchoolsCount,
        mrr: mrrTotal,
        schoolsAtRisk: healthData.at_risk,
        trialExpiringThisWeek: trialExpiringThisWeekCount,
      },
      healthDistribution: {
        healthy: healthData.healthy,
        needsAttention: healthData.needs_attention,
        atRisk: healthData.at_risk,
        inactive: healthData.inactive,
      },
      growthTrends,
      insights,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch platform metrics", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
