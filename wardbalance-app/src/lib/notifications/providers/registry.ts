import type { NotificationProvider } from "./interface";
import { resendProvider } from "./resend-provider";
import { termiiProvider } from "./termii-provider";
import { noopProvider } from "./noop-provider";

const providers: Record<string, NotificationProvider> = {
  email: resendProvider,
  sms: termiiProvider,
};

export function getProvider(channel: string): NotificationProvider {
  return providers[channel] ?? noopProvider;
}

export function registerProvider(channel: string, provider: NotificationProvider): void {
  providers[channel] = provider;
}
