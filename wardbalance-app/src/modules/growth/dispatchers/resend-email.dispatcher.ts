import { CampaignDispatcher, SendOptions } from "./interface";
import { Resend } from "resend";

const globalForResend = globalThis as unknown as { resend: Resend | null };

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!globalForResend.resend) {
    globalForResend.resend = new Resend(process.env.RESEND_API_KEY);
  }
  return globalForResend.resend;
}

export class ResendEmailDispatcher implements CampaignDispatcher {
  async send(options: SendOptions): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const resend = getResend();
    
    // If API key is missing (e.g. locally or in staging), simulate a successful dispatch.
    if (!resend) {
      console.warn(`[resend-dispatcher] MOCK SEND to ${options.recipientContact}: ${options.subject}`);
      return { success: true, providerId: `mock-resend-${Date.now()}` };
    }

    const from = process.env.RESEND_FROM_EMAIL || "hello@wardbalance.com";

    try {
      const response = await resend.emails.send({
        from,
        to: options.recipientContact,
        subject: options.subject || "No Subject",
        html: options.htmlBody || "",
        headers: {
          "X-Entity-Ref-ID": options.recipientId,
          "idempotency-key": options.idempotencyKey,
        },
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      return { success: true, providerId: response.data?.id };
    } catch (e: any) {
      return { success: false, error: e.message || "Unknown sending error" };
    }
  }
}
