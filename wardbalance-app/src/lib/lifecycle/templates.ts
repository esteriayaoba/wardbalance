export interface LifecycleTemplate {
  id: string;
  channel: "email" | "sms";
  subject: string;
  buildBody: (vars: Record<string, string>) => string;
}

const templates: LifecycleTemplate[] = [
  {
    id: "welcome_email",
    channel: "email",
    subject: "Welcome to WardBalance, {{fullName}}!",
    buildBody: (v) =>
      `<h1>Welcome to WardBalance!</h1><p>Hi ${v.fullName},</p><p>Your school workspace <strong>${v.schoolName}</strong> is ready.</p><p>Complete your setup checklist to start managing fees and invoices.</p><p><a href="${v.appUrl}/admin/setup" style="display:inline-block;padding:12px 24px;background:#155EEF;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Start Setup</a></p>`,
  },
  {
    id: "setup_reminder_3d",
    channel: "email",
    subject: "Continue setting up {{schoolName}} on WardBalance",
    buildBody: (v) =>
      `<h1>You're almost there</h1><p>Hi ${v.fullName},</p><p>Your school <strong>${v.schoolName}</strong> is waiting. Complete the remaining setup steps to activate your financial dashboard.</p><p><a href="${v.appUrl}/admin/setup" style="display:inline-block;padding:12px 24px;background:#155EEF;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Continue Setup</a></p>`,
  },
  {
    id: "setup_reminder_7d",
    channel: "email",
    subject: "{{schoolName}} is ready — finish setup in 5 minutes",
    buildBody: (v) =>
      `<h1>Quick reminder</h1><p>Hi ${v.fullName},</p><p>Setting up <strong>${v.schoolName}</strong> on WardBalance takes just a few minutes. Once complete, you can generate invoices and start collecting fees.</p><p><a href="${v.appUrl}/admin/setup" style="display:inline-block;padding:12px 24px;background:#155EEF;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Complete Setup</a></p>`,
  },
  {
    id: "first_invoice_prompt",
    channel: "email",
    subject: "Generate your first invoices on WardBalance",
    buildBody: (v) =>
      `<h1>Your students are ready</h1><p>Hi ${v.fullName},</p><p>Your school structure is set up. Now it's time to generate invoices for the active term.</p><p><a href="${v.appUrl}/admin/invoices" style="display:inline-block;padding:12px 24px;background:#155EEF;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Generate Invoices</a></p>`,
  },
  {
    id: "inactive_14d",
    channel: "email",
    subject: "Your next term can be prepared in under 5 minutes",
    buildBody: (v) =>
      `<h1>We're here when you need us</h1><p>Hi ${v.fullName},</p><p>When you're ready for the next term, WardBalance makes it easy to set up classes, fees, and invoices quickly.</p><p><a href="${v.appUrl}/admin" style="display:inline-block;padding:12px 24px;background:#155EEF;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Go to Dashboard</a></p>`,
  },
  {
    id: "inactive_30d",
    channel: "email",
    subject: "We'd love to have you back, {{fullName}}",
    buildBody: (v) =>
      `<h1>It's been a while</h1><p>Hi ${v.fullName},</p><p>Your WardBalance workspace at <strong>${v.schoolName}</strong> is still active. Log in to manage fees, invoices, and payments for the upcoming term.</p><p><a href="${v.appUrl}/admin" style="display:inline-block;padding:12px 24px;background:#155EEF;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Sign In</a></p>`,
  },
];

export function getTemplate(id: string): LifecycleTemplate | undefined {
  return templates.find((t) => t.id === id);
}

export function getAllTemplates(): LifecycleTemplate[] {
  return [...templates];
}
