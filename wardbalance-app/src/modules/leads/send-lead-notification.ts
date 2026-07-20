import { Resend } from "resend";
import { sendEmail } from "@/lib/email/resend";

interface LeadNotificationInput {
  fullName: string;
  schoolName: string;
  role: string;
  email: string;
  phone?: string | null;
  numberOfStudents?: string | null;
  preferredContactMethod?: string;
  message?: string | null;
  source?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  landingPage?: string | null;
  createdAt: Date;
}

function formatValue(value: string | null | undefined): string {
  return value ?? "—";
}

const row = (label: string, value: string): string =>
  `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#333;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555">${value}</td></tr>`;

export async function sendLeadNotification(lead: LeadNotificationInput) {
  const to = process.env.LEAD_NOTIFICATION_EMAIL;
  if (!to) {
    console.warn(
      "[leads] LEAD_NOTIFICATION_EMAIL not set — skipping notification email",
    );
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;margin:0;padding:0;background:#f5f5f5">
  <table style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden">
    <tr>
      <td style="padding:24px;background:#155EEF;color:#fff;text-align:center;font-size:20px;font-weight:700">
        New WardBalance Lead
      </td>
    </tr>
    <tr>
      <td style="padding:24px">
        <p style="margin:0 0 16px;color:#555;font-size:14px">A new school has submitted the early access form.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${row("Full Name", lead.fullName)}
          ${row("School", lead.schoolName)}
          ${row("Role", lead.role)}
          ${row("Email", lead.email)}
          ${row("Phone", formatValue(lead.phone))}
          ${row("Students", formatValue(lead.numberOfStudents))}
          ${row("Contact Method", formatValue(lead.preferredContactMethod))}
          ${row("Message", formatValue(lead.message))}
          ${row("Source", formatValue(lead.source))}
          ${row("UTM Source", formatValue(lead.utmSource))}
          ${row("UTM Medium", formatValue(lead.utmMedium))}
          ${row("UTM Campaign", formatValue(lead.utmCampaign))}
          ${row("Referrer", formatValue(lead.referrer))}
          ${row("Landing Page", formatValue(lead.landingPage))}
          ${row("Date", lead.createdAt.toISOString())}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await sendEmail({
    to,
    subject: `New WardBalance Lead: ${lead.schoolName}`,
    html,
  });

  if (error) {
    // TODO: add to background job queue when available
    // Do not throw — lead is already saved, email failure should not block response
    // TODO: Production email requires a verified Resend sender domain.
    // Without verification, Resend will reject the send.
    console.warn("[leads] Email notification failed:", error);
  }
}

/**
 * Adds a lead to the Resend Audience so they can receive broadcast emails
 * and drip sequences. Silently skips if RESEND_AUDIENCE_ID is not configured.
 */
export async function addLeadToAudience(lead: {
  email: string;
  fullName: string;
}) {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const apiKey = process.env.RESEND_API_KEY;

  if (!audienceId || !apiKey) {
    console.warn("[leads] RESEND_AUDIENCE_ID or RESEND_API_KEY not set — skipping audience sync");
    return;
  }

  const [firstName, ...rest] = lead.fullName.trim().split(" ");
  const lastName = rest.join(" ") || "";

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.contacts.create({
      audienceId,
      email: lead.email,
      firstName: firstName ?? "",
      lastName,
      unsubscribed: false,
    });

    if (error) {
      console.warn("[leads] Failed to add contact to Resend Audience:", error);
    } else {
      console.log(`[leads] Added ${lead.email} to Resend Audience`);
    }
  } catch (err) {
    // Never throw — lead save must not be blocked by audience sync failure
    console.warn("[leads] Resend Audience sync error:", err);
  }
}
