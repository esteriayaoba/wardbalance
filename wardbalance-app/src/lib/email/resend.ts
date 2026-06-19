import { Resend } from "resend";

const globalForResend = globalThis as unknown as { resend: Resend | null };

/** Resend is optional. If RESEND_API_KEY is absent, email sending is a no-op. */
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!globalForResend.resend) {
    globalForResend.resend = new Resend(process.env.RESEND_API_KEY);
  }
  return globalForResend.resend;
}

export function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  if (!resend) {
    // TODO: RESEND_API_KEY is not configured — log and skip.
    // TODO: add to a background job queue (BullMQ / Upstash Redis) when available.
    // TODO: Before production launch, verify the Resend sender domain and set RESEND_API_KEY + RESEND_FROM_EMAIL.
    console.warn(
      "[resend] RESEND_API_KEY not set — email not sent",
    );
    return Promise.resolve({ data: null, error: new Error("RESEND_API_KEY not set") });
  }

  const from = process.env.RESEND_FROM_EMAIL;

  if (!from) {
    // TODO: RESEND_FROM_EMAIL not configured — log and skip
    // TODO: add to a background job queue (BullMQ / Upstash Redis) when available
    console.warn(
      "[resend] RESEND_FROM_EMAIL not set — email not sent",
    );
    return Promise.resolve({ data: null, error: new Error("RESEND_FROM_EMAIL not set") });
  }

  return resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}
