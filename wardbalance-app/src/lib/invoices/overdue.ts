import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { enqueueNotification } from "@/lib/notifications";
import { logError } from "@/lib/logger";

const REMINDER_COOLDOWN_DAYS = 3;

export async function processOverdueInvoices() {
  const now = new Date();
  const cooldownDate = new Date();
  cooldownDate.setDate(now.getDate() - REMINDER_COOLDOWN_DAYS);

  const invoicesToMark = await prisma.invoice.findMany({
    where: {
      status: { in: ["issued", "partial"] },
      dueDate: { lt: now },
      balanceDue: { gt: 0 },
      term: { status: "active" },
    },
    select: {
      id: true,
      schoolId: true,
      balanceDue: true,
      dueDate: true,
      studentId: true,
    },
  });

  for (const invoice of invoicesToMark) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "overdue", overdueMarkedAt: now },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: invoice.schoolId,
        actorId: "system-cron",
        actorName: "System",
        action: "invoice.marked_overdue",
        entityType: "Invoice",
        entityId: invoice.id,
        newValue: {
          balanceDue: invoice.balanceDue.toString(),
          dueDate: invoice.dueDate.toISOString(),
        },
      },
    });
  }

  const invoicesToRemind = await prisma.invoice.findMany({
    where: {
      status: "overdue",
      balanceDue: { gt: 0 },
      term: { status: "active" },
      OR: [
        { lastReminderSentAt: null },
        { lastReminderSentAt: { lt: cooldownDate } },
      ],
    },
    include: {
      school: { select: { name: true } },
      student: {
        select: {
          firstName: true,
          lastName: true,
          parents: {
            include: { parent: { select: { id: true, firstName: true, email: true, phone: true } } },
          },
        },
      },
    },
  });

  let reminderCount = 0;

  for (const invoice of invoicesToRemind) {
    const targetParents = invoice.student.parents.filter(
      (p) => p.receivesInvoiceNotifications || p.isPrimaryContact
    );

    const balanceDisplay = `₦${Number(invoice.balanceDue.toString()).toLocaleString()}`;
    const studentName = `${invoice.student.firstName} ${invoice.student.lastName}`;
    let reminderQueuedForInvoice = false;

    for (const link of targetParents) {
      const parent = link.parent;

      if (parent.email) {
        await enqueueNotification({
          schoolId: invoice.schoolId,
          parentId: parent.id,
          channel: "email",
          recipient: parent.email,
          subject: `Overdue Invoice Reminder: ${studentName}`,
          content: `<h3>Invoice Overdue</h3><p>Dear ${parent.firstName},</p><p>This is a reminder that the invoice for <strong>${studentName}</strong> is overdue.</p><p><strong>Balance Due:</strong> ${balanceDisplay}</p><p>Please pay via the Parent Portal.</p>`,
          reference: invoice.id,
        });
        reminderCount++;
        reminderQueuedForInvoice = true;
      }

      if (parent.phone) {
        await enqueueNotification({
          schoolId: invoice.schoolId,
          parentId: parent.id,
          channel: "sms",
          recipient: parent.phone,
          content: `WardBalance: Invoice for ${studentName} is overdue. Balance: ${balanceDisplay}. Please pay via Parent Portal.`,
          reference: invoice.id,
        });
        reminderCount++;
        reminderQueuedForInvoice = true;
      }
    }

    if (reminderQueuedForInvoice) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          lastReminderSentAt: now,
          reminderCount: { increment: 1 },
        },
      });
    }
  }

  return {
    markedOverdue: invoicesToMark.length,
    remindersQueued: reminderCount,
  };
}

export async function getOverdueStats(schoolId: string) {
  const now = new Date();
  const cooldownDate = new Date();
  cooldownDate.setDate(now.getDate() - REMINDER_COOLDOWN_DAYS);

  const [overdueCount, overdueTotal, pendingReminders] = await Promise.all([
    prisma.invoice.count({
      where: { schoolId, status: "overdue", balanceDue: { gt: 0 } },
    }),
    prisma.invoice.aggregate({
      where: { schoolId, status: "overdue" },
      _sum: { balanceDue: true },
    }),
    prisma.invoice.count({
      where: {
        schoolId, status: "overdue", balanceDue: { gt: 0 }, term: { status: "active" },
        OR: [
          { lastReminderSentAt: null },
          { lastReminderSentAt: { lt: cooldownDate } },
        ],
      },
    }),
  ]);

  return {
    overdueCount,
    overdueTotal: (overdueTotal._sum.balanceDue ?? new Prisma.Decimal(0)).toString(),
    pendingReminders,
  };
}
