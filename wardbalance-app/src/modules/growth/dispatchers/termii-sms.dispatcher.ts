import { sendTermiiSMS } from "@/lib/termii";

export interface SendSmsPayload {
  recipientContact: string;
  smsBody: string;
  idempotencyKey?: string;
}

export interface SendSmsResult {
  success: boolean;
  providerId?: string;
  error?: string;
}

export class TermiiSmsDispatcher {
  async send(payload: SendSmsPayload): Promise<SendSmsResult> {
    try {
      if (!payload.recipientContact || !payload.smsBody) {
        return {
          success: false,
          error: "Recipient phone number or SMS body missing",
        };
      }

      const res = await sendTermiiSMS(payload.recipientContact, payload.smsBody);
      if (res && res.message_id) {
        return {
          success: true,
          providerId: res.message_id,
        };
      }

      return {
        success: false,
        error: "Termii response missing message_id",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to dispatch SMS",
      };
    }
  }
}
