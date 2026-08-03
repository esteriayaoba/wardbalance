export interface SendOptions {
  recipientId: string;
  recipientContact: string; // Email address or phone number
  firstName: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  idempotencyKey: string;
}

export interface CampaignDispatcher {
  send(options: SendOptions): Promise<{ success: boolean; providerId?: string; error?: string }>;
}
