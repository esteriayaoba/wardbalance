import { prisma } from "@/lib/prisma";

export type SegmentType =
  | "ALL_LEADS"
  | "NEW_LEADS"
  | "BOOKED_DEMO"
  | "DEMO_NO_SHOW"
  | "REGISTERED_SCHOOLS"
  | "ONBOARDING_SCHOOLS"
  | "INACTIVE_SCHOOLS"
  | "TRIAL_EXPIRING"
  | "PAYING_CUSTOMERS"
  | "CANCELLED_CUSTOMERS"
  | "NEVER_LOGGED_IN"
  | "NEVER_CREATED_CLASS"
  | "NEVER_CREATED_INVOICE";

export interface ResolvedRecipient {
  id: string; // Lead ID or User ID
  email: string;
  firstName: string;
  schoolName: string;
  type: "lead" | "school_admin";
  targetId: string; // The specific leadId or schoolId
}

export interface AudienceEstimation {
  segment: SegmentType;
  eligibleCount: number;
  suppressedCount: number;
  invalidCount: number;
  finalCount: number;
}

export class CampaignAudienceResolver {
  /**
   * Resolves a dynamic segment of recipients.
   */
  static async resolveSegment(segment: SegmentType): Promise<ResolvedRecipient[]> {
    let candidates: ResolvedRecipient[] = [];

    switch (segment) {
      case "ALL_LEADS": {
        const leads = await prisma.lead.findMany({
          where: { status: { not: "converted" } },
        });
        candidates = leads.map((l) => ({
          id: l.id,
          email: l.email,
          firstName: l.fullName.split(" ")[0] || "User",
          schoolName: l.schoolName,
          type: "lead",
          targetId: l.id,
        }));
        break;
      }
      case "NEW_LEADS": {
        const leads = await prisma.lead.findMany({
          where: { status: "new" },
        });
        candidates = leads.map((l) => ({
          id: l.id,
          email: l.email,
          firstName: l.fullName.split(" ")[0] || "User",
          schoolName: l.schoolName,
          type: "lead",
          targetId: l.id,
        }));
        break;
      }
      case "BOOKED_DEMO": {
        const leads = await prisma.lead.findMany({
          where: { status: { in: ["contacted", "qualified"] } },
        });
        candidates = leads.map((l) => ({
          id: l.id,
          email: l.email,
          firstName: l.fullName.split(" ")[0] || "User",
          schoolName: l.schoolName,
          type: "lead",
          targetId: l.id,
        }));
        break;
      }
      case "DEMO_NO_SHOW": {
        const leads = await prisma.lead.findMany({
          where: { status: { in: ["unqualified", "archived"] } },
        });
        candidates = leads.map((l) => ({
          id: l.id,
          email: l.email,
          firstName: l.fullName.split(" ")[0] || "User",
          schoolName: l.schoolName,
          type: "lead",
          targetId: l.id,
        }));
        break;
      }
      case "REGISTERED_SCHOOLS": {
        // Converted leads (schools created but onboarding checklist not started)
        const schools = await prisma.school.findMany({
          where: { status: "invited" },
          include: { users: { take: 1, orderBy: { createdAt: "asc" } } },
        });
        candidates = schools.map((s) => {
          const admin = s.users[0];
          return {
            id: admin?.id ?? s.id,
            email: admin?.email ?? s.email ?? "",
            firstName: admin?.fullName.split(" ")[0] ?? "Admin",
            schoolName: s.name,
            type: "school_admin",
            targetId: s.id,
          };
        });
        break;
      }
      case "ONBOARDING_SCHOOLS": {
        // Registered schools with incomplete onboarding setup
        const schools = await prisma.school.findMany({
          where: { status: "onboarding" },
          include: { users: { take: 1, orderBy: { createdAt: "asc" } } },
        });
        candidates = schools.map((s) => {
          const admin = s.users[0];
          return {
            id: admin?.id ?? s.id,
            email: admin?.email ?? s.email ?? "",
            firstName: admin?.fullName.split(" ")[0] ?? "Admin",
            schoolName: s.name,
            type: "school_admin",
            targetId: s.id,
          };
        });
        break;
      }
      case "INACTIVE_SCHOOLS": {
        // No logins in 14 days
        const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const activeSchools = await prisma.auditLog.findMany({
          where: {
            action: { in: ["auth.login", "auth.email_verified"] },
            createdAt: { gte: cutoff },
          },
          select: { schoolId: true },
          distinct: ["schoolId"],
        });
        const activeIds = activeSchools.map((as) => as.schoolId);

        const inactiveSchools = await prisma.school.findMany({
          where: { id: { notIn: activeIds } },
          include: { users: { take: 1, orderBy: { createdAt: "asc" } } },
        });
        candidates = inactiveSchools.map((s) => {
          const admin = s.users[0];
          return {
            id: admin?.id ?? s.id,
            email: admin?.email ?? s.email ?? "",
            firstName: admin?.fullName.split(" ")[0] ?? "Admin",
            schoolName: s.name,
            type: "school_admin",
            targetId: s.id,
          };
        });
        break;
      }
      case "TRIAL_EXPIRING": {
        // Trial expires in next 3 days
        const targetStart = new Date();
        const targetEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        const schools = await prisma.school.findMany({
          where: {
            trialEndsAt: { gte: targetStart, lte: targetEnd },
          },
          include: { users: { take: 1, orderBy: { createdAt: "asc" } } },
        });
        candidates = schools.map((s) => {
          const admin = s.users[0];
          return {
            id: admin?.id ?? s.id,
            email: admin?.email ?? s.email ?? "",
            firstName: admin?.fullName.split(" ")[0] ?? "Admin",
            schoolName: s.name,
            type: "school_admin",
            targetId: s.id,
          };
        });
        break;
      }
      case "PAYING_CUSTOMERS": {
        const subscriptions = await prisma.schoolSubscription.findMany({
          where: { status: "active" },
          include: {
            school: { include: { users: { take: 1, orderBy: { createdAt: "asc" } } } },
          },
        });
        candidates = subscriptions.map((sub) => {
          const s = sub.school;
          const admin = s.users[0];
          return {
            id: admin?.id ?? s.id,
            email: admin?.email ?? s.email ?? "",
            firstName: admin?.fullName.split(" ")[0] ?? "Admin",
            schoolName: s.name,
            type: "school_admin",
            targetId: s.id,
          };
        });
        break;
      }
      case "CANCELLED_CUSTOMERS": {
        const subscriptions = await prisma.schoolSubscription.findMany({
          where: { status: { in: ["cancelled", "expired"] } },
          include: {
            school: { include: { users: { take: 1, orderBy: { createdAt: "asc" } } } },
          },
        });
        candidates = subscriptions.map((sub) => {
          const s = sub.school;
          const admin = s.users[0];
          return {
            id: admin?.id ?? s.id,
            email: admin?.email ?? s.email ?? "",
            firstName: admin?.fullName.split(" ")[0] ?? "Admin",
            schoolName: s.name,
            type: "school_admin",
            targetId: s.id,
          };
        });
        break;
      }
      case "NEVER_LOGGED_IN": {
        const logins = await prisma.auditLog.findMany({
          where: { action: { in: ["auth.login", "auth.email_verified"] } },
          select: { schoolId: true },
          distinct: ["schoolId"],
        });
        const loggedInIds = logins.map((l) => l.schoolId);

        const schools = await prisma.school.findMany({
          where: { id: { notIn: loggedInIds } },
          include: { users: { take: 1, orderBy: { createdAt: "asc" } } },
        });
        candidates = schools.map((s) => {
          const admin = s.users[0];
          return {
            id: admin?.id ?? s.id,
            email: admin?.email ?? s.email ?? "",
            firstName: admin?.fullName.split(" ")[0] ?? "Admin",
            schoolName: s.name,
            type: "school_admin",
            targetId: s.id,
          };
        });
        break;
      }
      case "NEVER_CREATED_CLASS": {
        const classes = await prisma.classArm.findMany({
          select: { schoolId: true },
          distinct: ["schoolId"],
        });
        const classIds = classes.map((c) => c.schoolId);

        const schools = await prisma.school.findMany({
          where: { id: { notIn: classIds } },
          include: { users: { take: 1, orderBy: { createdAt: "asc" } } },
        });
        candidates = schools.map((s) => {
          const admin = s.users[0];
          return {
            id: admin?.id ?? s.id,
            email: admin?.email ?? s.email ?? "",
            firstName: admin?.fullName.split(" ")[0] ?? "Admin",
            schoolName: s.name,
            type: "school_admin",
            targetId: s.id,
          };
        });
        break;
      }
      case "NEVER_CREATED_INVOICE": {
        const invoices = await prisma.invoice.findMany({
          select: { schoolId: true },
          distinct: ["schoolId"],
        });
        const invoiceIds = invoices.map((i) => i.schoolId);

        const schools = await prisma.school.findMany({
          where: { id: { notIn: invoiceIds } },
          include: { users: { take: 1, orderBy: { createdAt: "asc" } } },
        });
        candidates = schools.map((s) => {
          const admin = s.users[0];
          return {
            id: admin?.id ?? s.id,
            email: admin?.email ?? s.email ?? "",
            firstName: admin?.fullName.split(" ")[0] ?? "Admin",
            schoolName: s.name,
            type: "school_admin",
            targetId: s.id,
          };
        });
        break;
      }
    }

    // Apply suppression lists and invalid emails filter
    const suppressed = await prisma.suppressionList.findMany({
      select: { email: true },
    });
    const suppressedEmails = new Set(suppressed.map((s) => s.email.toLowerCase()));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Deduplicate and filter candidates
    const seenEmails = new Set<string>();
    const filtered: ResolvedRecipient[] = [];

    for (const c of candidates) {
      if (!c.email) continue;
      const emailLower = c.email.toLowerCase().trim();

      // Skip duplicates, invalid syntax, and suppressed lists
      if (seenEmails.has(emailLower)) continue;
      seenEmails.add(emailLower);

      if (!emailRegex.test(emailLower)) continue;
      if (suppressedEmails.has(emailLower)) continue;

      filtered.push(c);
    }

    return filtered;
  }

  /**
   * Calculate audience estimates for the composer view.
   */
  static async estimateAudience(segment: SegmentType): Promise<AudienceEstimation> {
    const rawList = await this.resolveSegment(segment);
    
    // We can simulate suppression counts by comparing candidate counts before filtering
    const suppressedList = await prisma.suppressionList.findMany({
      select: { email: true },
    });
    const suppressedEmails = new Set(suppressedList.map((s) => s.email.toLowerCase()));

    let rawCandidatesCount = rawList.length; // Simplified for estimation mock
    let suppressedCount = 0;
    let invalidCount = 0;

    for (const r of rawList) {
      if (suppressedEmails.has(r.email.toLowerCase())) {
        suppressedCount++;
      }
    }

    return {
      segment,
      eligibleCount: rawCandidatesCount + suppressedCount + invalidCount,
      suppressedCount,
      invalidCount,
      finalCount: rawList.length,
    };
  }
}
