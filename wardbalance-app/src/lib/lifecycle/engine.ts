import { prisma } from "@/lib/prisma";
import { evaluateStage } from "./stages";
import { getMilestones, recordMilestone, type Milestone } from "./events";
import { getTemplate } from "./templates";
import { enqueueNotification } from "@/lib/notifications/notification-service";

interface TriggerCandidate {
  schoolId: string;
  userId: string;
  userEmail: string;
  fullName: string;
  schoolName: string;
  triggerKey: string;
  templateId: string;
  channel: "email" | "sms";
}

async function getAdminUsers(schoolId: string) {
  return prisma.user.findMany({
    where: { schoolId, role: { in: ["SchoolOwner", "Principal"] } },
    select: { id: true, email: true, fullName: true },
  });
}

async function getSchool(schoolId: string) {
  return prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, status: true, createdAt: true },
  });
}

async function hasNotificationHistory(
  schoolId: string,
  userId: string,
  triggerKey: string,
): Promise<boolean> {
  const count = await prisma.notificationHistory.count({
    where: { schoolId, userId, trigger: triggerKey },
  });
  return count > 0;
}

async function recordNotificationSent(
  schoolId: string,
  userId: string,
  triggerKey: string,
  templateId: string,
  channel: string,
  recipient: string,
  success: boolean,
) {
  await prisma.notificationHistory.create({
    data: {
      schoolId,
      userId,
      trigger: triggerKey,
      template: templateId,
      channel,
      recipient,
      status: success ? "sent" : "failed",
      subject: undefined,
    },
  });
}

export interface LifecycleEvaluationResult {
  schoolId: string;
  triggerFired: string | null;
  enqueued: boolean;
  reason: string;
}

export async function evaluateSchool(schoolId: string): Promise<LifecycleEvaluationResult> {
  const school = await getSchool(schoolId);
  if (!school) return { schoolId, triggerFired: null, enqueued: false, reason: "School not found" };
  if (school.status === "paused" || school.status === "archived") {
    return { schoolId, triggerFired: null, enqueued: false, reason: "School paused or archived" };
  }

  const milestones = await getMilestones(schoolId);
  const completed = new Set(milestones.map((m) => m.milestone));
  const admins = await getAdminUsers(schoolId);
  if (admins.length === 0) {
    return { schoolId, triggerFired: null, enqueued: false, reason: "No admin users" };
  }

  const admin = admins[0];
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(school.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysSinceLastLogin = 999;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const vars: Record<string, string> = {
    fullName: admin.fullName,
    schoolName: school.name,
    appUrl,
  };

  const triggers: Array<{
    key: string;
    templateId: string;
    channel: "email" | "sms";
    shouldFire: boolean;
  }> = [
    {
      key: "welcome_immediate",
      templateId: "welcome_email",
      channel: "email",
      shouldFire: completed.has("account_created") && !completed.has("setup_wizard_started") && daysSinceCreation <= 1 && !completed.has("welcome_sent"),
    },
    {
      key: "setup_reminder_3d",
      templateId: "setup_reminder_3d",
      channel: "email",
      shouldFire: daysSinceCreation >= 3 && !completed.has("setup_completed") && !completed.has("setup_wizard_started"),
    },
    {
      key: "setup_reminder_7d",
      templateId: "setup_reminder_7d",
      channel: "email",
      shouldFire: daysSinceCreation >= 7 && !completed.has("setup_completed"),
    },
    {
      key: "first_invoice_prompt",
      templateId: "first_invoice_prompt",
      channel: "email",
      shouldFire: completed.has("setup_completed") && !completed.has("first_invoice_generated") && daysSinceCreation >= 1,
    },
    {
      key: "inactive_14d",
      templateId: "inactive_14d",
      channel: "email",
      shouldFire: completed.has("school_active") && daysSinceLastLogin >= 14,
    },
    {
      key: "inactive_30d",
      templateId: "inactive_30d",
      channel: "email",
      shouldFire: completed.has("school_active") && daysSinceLastLogin >= 30,
    },
  ];

  for (const trigger of triggers) {
    if (!trigger.shouldFire) continue;

    const alreadySent = await hasNotificationHistory(schoolId, admin.id, trigger.key);
    if (alreadySent) continue;

    const template = getTemplate(trigger.templateId);
    if (!template) continue;

    await enqueueNotification({
      schoolId,
      userId: admin.id,
      channel: trigger.channel,
      recipient: admin.email,
      subject: template.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? ""),
      content: template.buildBody(vars),
      reference: `lifecycle-${trigger.key}-${schoolId}`,
      trigger: trigger.key,
      template: trigger.templateId,
    });

    await recordNotificationSent(
      schoolId, admin.id, trigger.key, trigger.templateId, trigger.channel, admin.email, true,
    );

    return {
      schoolId,
      triggerFired: trigger.key,
      enqueued: true,
      reason: `Triggered: ${trigger.key}`,
    };
  }

  return { schoolId, triggerFired: null, enqueued: false, reason: "No trigger matched" };
}

const BATCH_CONCURRENCY = 10;

export async function evaluateAllSchools(): Promise<LifecycleEvaluationResult[]> {
  const schools = await prisma.school.findMany({
    where: { status: { in: ["onboarding", "active"] } },
    select: { id: true },
  });

  const results: LifecycleEvaluationResult[] = [];

  for (let i = 0; i < schools.length; i += BATCH_CONCURRENCY) {
    const batch = schools.slice(i, i + BATCH_CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map((school) =>
        evaluateSchool(school.id).catch((err) => ({
          schoolId: school.id,
          triggerFired: null,
          enqueued: false,
          reason: err instanceof Error ? err.message : "Unknown error",
        } as LifecycleEvaluationResult)),
      ),
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push(r.value);
      } else {
        results.push({
          schoolId: "unknown",
          triggerFired: null,
          enqueued: false,
          reason: r.reason instanceof Error ? r.reason.message : "Unknown error",
        });
      }
    }
  }

  return results;
}
