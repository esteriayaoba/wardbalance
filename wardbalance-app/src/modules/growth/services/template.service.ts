import { prisma } from "@/lib/prisma";

export interface DefaultTemplateConfig {
  id: string;
  name: string;
  category: string;
  subject: string;
  previewText: string;
  htmlBody: string;
  textBody?: string;
  ctaUrl?: string;
}

const DEFAULT_TEMPLATES: DefaultTemplateConfig[] = [
  {
    id: "default_welcome",
    name: "Welcome to WardBalance",
    category: "acquisition",
    subject: "Welcome to WardBalance! 🎉 Let's get started",
    previewText: "We are excited to help you track fees and manage invoicing at WhatsApp-level simplicity.",
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #155EEF; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Welcome to WardBalance, {{firstName}}! 🎉</h2>
        <p style="font-size: 16px; margin-bottom: 24px;">We're thrilled to welcome <strong>{{schoolName}}</strong> to the WardBalance family. Our mission is simple: to help you track who has paid, how much, and what is still owed—with zero Excel headache.</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="https://wardbalance.com/login" style="background-color: #155EEF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Log In to Your Workspace</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          If you have any questions, reply directly to this email or message us on WhatsApp. We're here to help!<br/>
          <a href="{{unsubscribe}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `,
  },
  {
    id: "default_complete_registration",
    name: "Complete Registration",
    category: "activation",
    subject: "Finish setting up {{schoolName}} account",
    previewText: "You are one step away from launching your school portal.",
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #155EEF; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Hi {{firstName}}, let's finish your setup!</h2>
        <p style="font-size: 16px; margin-bottom: 24px;">You recently started setting up your account for <strong>{{schoolName}}</strong>, but haven't finished creating your administrator credentials.</p>
        <p style="font-size: 16px; margin-bottom: 24px;">Complete your registration now to log in and start collecting school fees online.</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="https://wardbalance.com/signup" style="background-color: #155EEF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Complete Setup</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <a href="{{unsubscribe}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `,
  },
  {
    id: "default_complete_setup",
    name: "Complete School Setup Checklist",
    category: "activation",
    subject: "Get ready to invoice: Complete your checklist steps 📋",
    previewText: "Complete your checklist steps to start generating invoices.",
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #155EEF; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Setup your school workspace, {{firstName}}!</h2>
        <p style="font-size: 16px; margin-bottom: 24px;">Your workspace for <strong>{{schoolName}}</strong> is active, but you have a few pending setup steps before you can generate invoices and record payments.</p>
        <ul style="font-size: 16px; margin-bottom: 24px; padding-left: 20px;">
          <li>Create Academic Sessions & Terms</li>
          <li>Set up Divisions & Classes</li>
          <li>Import Students & Link Parents</li>
          <li>Set up Fee Templates</li>
        </ul>
        <div style="margin: 32px 0; text-align: center;">
          <a href="https://wardbalance.com/admin/setup" style="background-color: #155EEF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Go to Setup Checklist</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <a href="{{unsubscribe}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `,
  },
  {
    id: "default_trial_reminder",
    name: "Trial Ending Reminder",
    category: "conversion",
    subject: "Your WardBalance Trial ends in 3 days ⏳",
    previewText: "Keep tracking school finance without interruption. Upgrade now.",
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #e59800; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Your free trial is expiring soon, {{firstName}}!</h2>
        <p style="font-size: 16px; margin-bottom: 24px;">This is a reminder that the free trial for <strong>{{schoolName}}</strong> will end in 3 days.</p>
        <p style="font-size: 16px; margin-bottom: 24px;">Upgrade to the premium subscription plan today to ensure your school collections, invoices, parent links, and reports remain active without interruption.</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="https://wardbalance.com/admin/settings/subscription" style="background-color: #155EEF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Upgrade Subscription</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <a href="{{unsubscribe}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `,
  },
  {
    id: "default_subscription_renewal",
    name: "Subscription Renewal",
    category: "retention",
    subject: "Action Required: Renew your subscription for {{schoolName}}",
    previewText: "Your subscription renewal invoice is ready. Avoid account lock.",
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #DC2626; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Renew your subscription</h2>
        <p style="font-size: 16px; margin-bottom: 24px;">Hi {{firstName}}, the subscription term for <strong>{{schoolName}}</strong> has expired.</p>
        <p style="font-size: 16px; margin-bottom: 24px;">To reactivate your full workspace and continue tracking term fees, please click the button below to process your renewal secure card payment.</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="https://wardbalance.com/admin/settings/subscription" style="background-color: #155EEF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Process Renewal</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <a href="{{unsubscribe}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `,
  },
  {
    id: "default_feature_announcement",
    name: "Feature Announcement",
    category: "retention",
    subject: "Introducing: Real-time Parent Portal & Payments! 📱",
    previewText: "Let parents download receipts and upload bank transfers instantly.",
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #155EEF; font-size: 24px; font-weight: bold; margin-bottom: 16px;">We just released the Parent Portal! 🚀</h2>
        <p style="font-size: 16px; margin-bottom: 24px;">Hi {{firstName}}, we have some exciting news for <strong>{{schoolName}}</strong>.</p>
        <p style="font-size: 16px; margin-bottom: 24px;">You can now invite parents to download receipts, view invoice breakdowns, and upload bank transfer proof direct from their mobile phones—saving your bursar hours of manual WhatsApp verification.</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="https://wardbalance.com/admin" style="background-color: #155EEF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Explore Portal Settings</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <a href="{{unsubscribe}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `,
  },
  {
    id: "default_subscription_renewal",
    name: "Subscription Renewal Reminder",
    category: "renewal",
    subject: "Your WardBalance subscription renews soon 🔄",
    previewText: "Keep your school finance running without interruption.",
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #155EEF; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Hi {{firstName}}, your subscription is renewing soon</h2>
        <p style="font-size: 16px; margin-bottom: 24px;">This is a friendly reminder that your WardBalance subscription for <strong>{{schoolName}}</strong> will automatically renew in the next few days.</p>
        <p style="font-size: 16px; margin-bottom: 24px;">No action is required if you'd like to continue tracking school finances without interruption.</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="https://wardbalance.com/admin/settings/subscription" style="background-color: #155EEF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Manage Subscription</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <a href="{{unsubscribe}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `,
  },
  {
    id: "default_feature_update",
    name: "Product Feature Announcement",
    category: "feature_update",
    subject: "New in WardBalance: {{featureName}} is now live 🚀",
    previewText: "A new update that makes managing school finance even easier.",
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #155EEF; font-size: 24px; font-weight: bold; margin-bottom: 16px;">We've been busy building for you, {{firstName}} 🚀</h2>
        <p style="font-size: 16px; margin-bottom: 24px;">We've just released a new update for <strong>{{schoolName}}</strong> that makes managing school fees even simpler.</p>
        <div style="background: #EFF6FF; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
          <p style="font-size: 16px; font-weight: bold; color: #155EEF; margin: 0 0 8px;">What's new</p>
          <p style="font-size: 15px; margin: 0;">{{featureDescription}}</p>
        </div>
        <div style="margin: 32px 0; text-align: center;">
          <a href="https://wardbalance.com/admin" style="background-color: #155EEF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Try It Now</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <a href="{{unsubscribe}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `,
  },
  {
    id: "default_newsletter",
    name: "Monthly Newsletter",
    category: "newsletter",
    subject: "WardBalance Monthly: What's happening in school finance 📰",
    previewText: "Tips, updates, and news for Nigerian school administrators.",
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #155EEF; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Hello {{firstName}} 👋</h2>
        <p style="font-size: 16px; margin-bottom: 24px;">Here's your monthly update from the WardBalance team. We're constantly improving the platform to make school fee management simpler for <strong>{{schoolName}}</strong>.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
          <a href="{{unsubscribe}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `,
  },
  {
    id: "default_win_back",
    name: "Win-Back — Re-engagement",
    category: "win_back",
    subject: "We miss you, {{firstName}} — here's what's new at WardBalance",
    previewText: "It's been a while. Let's help you get back on track.",
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #155EEF; font-size: 24px; font-weight: bold; margin-bottom: 16px;">We've missed you, {{firstName}} 👋</h2>
        <p style="font-size: 16px; margin-bottom: 24px;">We noticed that <strong>{{schoolName}}</strong> hasn't been active on WardBalance recently. We'd love to help you get back on track and start tracking school fees again.</p>
        <p style="font-size: 16px; margin-bottom: 24px;">Since you've been away, we've improved invoice generation, added payment proof uploads, and made the parent portal even simpler.</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="https://wardbalance.com/login" style="background-color: #155EEF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Come Back to WardBalance</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <a href="{{unsubscribe}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `,
  },
  {
    id: "default_invoice_reminder",
    name: "Invoice Reminder",
    category: "invoice_reminder",
    subject: "Reminder: Outstanding invoices for {{schoolName}} ⚠️",
    previewText: "Some student invoices are still unpaid. Here's a summary.",
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #e59800; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Outstanding invoices — {{schoolName}}</h2>
        <p style="font-size: 16px; margin-bottom: 24px;">Hi {{firstName}}, this is a reminder that there are overdue invoices in your WardBalance workspace that may need attention.</p>
        <p style="font-size: 16px; margin-bottom: 24px;">Log in to your dashboard to review outstanding balances, send parent reminders, and record any recent payments.</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="https://wardbalance.com/admin/invoices" style="background-color: #155EEF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Review Outstanding Invoices</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <a href="{{unsubscribe}}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `,
  },
];

export class CampaignTemplateService {
  /**
   * Seed default templates if they don't already exist.
   */
  static async seedDefaultTemplates(): Promise<void> {
    for (const t of DEFAULT_TEMPLATES) {
      const exists = await prisma.campaignTemplate.findUnique({
        where: { id: t.id },
      });

      if (!exists) {
        await prisma.campaignTemplate.create({
          data: {
            id: t.id,
            name: t.name,
            category: t.category,
            subject: t.subject,
            previewText: t.previewText,
            htmlBody: t.htmlBody,
            textBody: t.textBody ?? "",
            isActive: true,
            version: 1,
          },
        });
        console.log(`[growth-template-seed] Seeded template: ${t.id}`);
      }
    }
  }

  static async listTemplates() {
    return prisma.campaignTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  static async getTemplate(id: string) {
    return prisma.campaignTemplate.findUnique({
      where: { id },
    });
  }
}
