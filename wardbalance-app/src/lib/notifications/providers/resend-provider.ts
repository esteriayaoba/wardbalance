import type { NotificationProvider, SendOptions, SendResult } from "./interface";
import { Resend } from "resend";

const globalForResend = globalThis as unknown as { resend: Resend | null };

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!globalForResend.resend) {
    globalForResend.resend = new Resend(process.env.RESEND_API_KEY);
  }
  return globalForResend.resend;
}

export const resendProvider: NotificationProvider = {
  channel: "email" as const,

  async send(options: SendOptions): Promise<SendResult> {
    const resend = getResend();
    if (!resend) {
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    const from = process.env.RESEND_FROM_EMAIL;
    if (!from) {
      return { success: false, error: "RESEND_FROM_EMAIL not configured" };
    }

    try {
      const result = await resend.emails.send({
        from,
        to: options.to,
        subject: options.subject ?? "",
        html: options.html ?? "",
      });

      return {
        success: true,
        providerId: result.data?.id ?? undefined,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown email error",
      };
    }
  },
};
