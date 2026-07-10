import type { NotificationProvider, SendOptions, SendResult } from "./interface";

function formatPhone(to: string): string {
  let formatted = to.replace(/\s+/g, "");
  if (formatted.startsWith("0")) formatted = "234" + formatted.slice(1);
  else if (formatted.startsWith("+")) formatted = formatted.slice(1);
  return formatted;
}

export const termiiProvider: NotificationProvider = {
  channel: "sms" as const,

  async send(options: SendOptions): Promise<SendResult> {
    const apiKey = process.env.TERMII_API_KEY;
    const senderId = process.env.TERMII_SENDER_ID || "WardBalance";

    if (!apiKey || apiKey === "mock") {
      return {
        success: true,
        providerId: `mock-${Date.now()}`,
      };
    }

    try {
      const response = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: formatPhone(options.to),
          from: senderId,
          sms: options.text ?? "",
          type: "plain",
          channel: "generic",
          api_key: apiKey,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          error: `Termii error ${response.status}: ${errorBody}`,
        };
      }

      const data = await response.json() as { message_id?: string };
      return {
        success: true,
        providerId: data.message_id,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown SMS error",
      };
    }
  },
};
