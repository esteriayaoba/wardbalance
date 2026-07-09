export interface SendOptions {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  reference?: string;
}

export interface SendResult {
  success: boolean;
  providerId?: string;
  error?: string;
}

export interface NotificationProvider {
  readonly channel: "email" | "sms";
  send(options: SendOptions): Promise<SendResult>;
}
