import { prisma } from "@/lib/prisma";
import { ResendEmailDispatcher } from "../dispatchers/resend-email.dispatcher";
import { TermiiSmsDispatcher } from "../dispatchers/termii-sms.dispatcher";

function replacePlaceholders(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export class JourneyExecutorService {
  private static emailDispatcher = new ResendEmailDispatcher();
  private static smsDispatcher = new TermiiSmsDispatcher();

  /**
   * Processes all active enrollments due for their next step.
   */
  static async processReadySteps(): Promise<{ executedCount: number; completedCount: number; exitedCount: number }> {
    const now = new Date();

    const dueEnrollments = await prisma.journeyEnrollment.findMany({
      where: {
        status: "ACTIVE",
        nextStepAt: { lte: now },
      },
      include: {
        journey: {
          include: {
            steps: { orderBy: { stepOrder: "asc" } },
          },
        },
        school: { select: { id: true, name: true, phone: true, email: true, status: true, subscription: true } },
        lead: { select: { id: true, fullName: true, schoolName: true, phone: true, email: true } },
      },
    });

    let executed = 0;
    let completed = 0;
    let exited = 0;

    for (const enrollment of dueEnrollments) {
      // 1. Check Exit Conditions
      const shouldExit = await this.evaluateExitConditions(enrollment);
      if (shouldExit) {
        await prisma.journeyEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "EXITED",
            completedAt: new Date(),
            exitReason: shouldExit.reason,
          },
        });
        exited++;
        continue;
      }

      // 2. Identify Target Step
      const nextStepOrder = enrollment.currentStep + 1;
      const targetStep = enrollment.journey.steps.find((s) => s.stepOrder === nextStepOrder);

      if (!targetStep) {
        // Journey finished
        await prisma.journeyEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
        completed++;
        continue;
      }

      // 3. Resolve Contact Info
      const firstName = enrollment.lead?.fullName?.split(" ")[0] || "School Leader";
      const schoolName = enrollment.school?.name || enrollment.lead?.schoolName || "your school";
      const phone = enrollment.school?.phone || enrollment.lead?.phone || "";

      const replacements = {
        firstName,
        schoolName,
        unsubscribe: `https://wardbalance.com/unsubscribe?email=${encodeURIComponent(enrollment.contactEmail)}`,
      };

      // 4. Dispatch Step Action
      if (targetStep.channel === "SMS") {
        if (!phone) {
          // No phone available — skip step without exiting
          console.warn(`[journey-executor] Skipping SMS for ${enrollment.contactEmail}: No phone available`);
        } else {
          const body = replacePlaceholders(targetStep.smsBody || "", replacements);
          await this.smsDispatcher.send({
            recipientContact: phone,
            smsBody: body,
            idempotencyKey: `journey-${enrollment.id}-step-${targetStep.id}`,
          });
        }
      } else {
        // EMAIL Channel
        const subject = replacePlaceholders(targetStep.subject || "WardBalance Update", replacements);
        const htmlBody = replacePlaceholders(targetStep.htmlBody || "", replacements);
        const textBody = targetStep.textBody ? replacePlaceholders(targetStep.textBody, replacements) : "";

        await this.emailDispatcher.send({
          recipientId: enrollment.id,
          recipientContact: enrollment.contactEmail,
          firstName,
          subject,
          htmlBody,
          textBody,
          idempotencyKey: `journey-${enrollment.id}-step-${targetStep.id}`,
        });
      }

      executed++;

      // 5. Advance Step Progress
      const subsequentStep = enrollment.journey.steps.find((s) => s.stepOrder === nextStepOrder + 1);
      const delayDays = subsequentStep?.delayDays || 1;
      const nextStepAt = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);

      if (!subsequentStep) {
        // This was the last step
        await prisma.journeyEnrollment.update({
          where: { id: enrollment.id },
          data: {
            currentStep: nextStepOrder,
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
        completed++;
      } else {
        await prisma.journeyEnrollment.update({
          where: { id: enrollment.id },
          data: {
            currentStep: nextStepOrder,
            nextStepAt,
          },
        });
      }
    }

    return { executedCount: executed, completedCount: completed, exitedCount: exited };
  }

  /**
   * Evaluates whether an enrollment should exit early.
   */
  private static async evaluateExitConditions(enrollment: any): Promise<{ reason: string } | null> {
    // Suppression list exit
    const suppressed = await prisma.suppressionList.findUnique({
      where: { email: enrollment.contactEmail.toLowerCase().trim() },
    });
    if (suppressed) {
      return { reason: `Suppressed: ${suppressed.reason}` };
    }

    // Trial / Activation exit: if school now has active subscription
    if (enrollment.school?.subscription && (enrollment.school.subscription as any).status === "active") {
      return { reason: "School subscribed to paid plan" };
    }

    return null;
  }
}
