import type { NotificationProvider, SendOptions, SendResult } from "./interface";

export const noopProvider: NotificationProvider = {
  channel: "email" as const,

  async send(options: SendOptions): Promise<SendResult> {
    return {
      success: true,
      providerId: `noop-${Date.now()}`,
    };
  },
};
