import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { CreateLeadSchema } from "@/modules/leads/lead.schema";
import { sendLeadNotification, addLeadToAudience } from "@/modules/leads/send-lead-notification";
import { rateLimit } from "@/lib/redis";
import { headers } from "next/headers";
import { sendEmail } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";

    const rl = await rateLimit(ipAddress, { prefix: "rate_limit:lead_form", maxRequests: 5, windowSeconds: 3600 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later.", code: "TOO_MANY_REQUESTS" },
        { status: 429 },
      );
    }

    const body = await request.json();

    // Validate with Zod
    const parsed = CreateLeadSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: firstError?.message ?? "Invalid input",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Honeypot check — if filled, silently reject
    if (data.website) {
      return NextResponse.json(
        {
          data: { leadId: "success" },
          message:
            "Thank you. We\u2019ll contact you shortly to learn more about your school\u2019s fee management needs.",
        },
        { status: 200 },
      );
    }

    const userAgent = headersList.get("user-agent") ?? undefined;

    // Normalize UTM values
    const normalize = (v: string | undefined): string | undefined =>
      v?.trim() || undefined;

    const utmSource = normalize(data.utmSource);
    const utmMedium = normalize(data.utmMedium);
    const utmCampaign = normalize(data.utmCampaign);
    const utmTerm = normalize(data.utmTerm);
    const utmContent = normalize(data.utmContent);
    const referrer = normalize(data.referrer);
    const landingPage = normalize(data.landingPage);

    // Upsert by email — handles both first submission and re-submission
    // The @@unique([email]) constraint on the Lead model ensures atomicity
    const now = new Date();

    const lead = await prisma.lead.upsert({
      where: { email: data.email },
      create: {
        fullName: data.fullName,
        schoolName: data.schoolName,
        role: data.role,
        email: data.email,
        phone: data.phone || null,
        numberOfStudents: data.numberOfStudents,
        preferredContactMethod: data.preferredContactMethod,
        message: data.message || null,
        source: data.source,
        consentToContact: true,
        consentTimestamp: data.consentTimestamp
          ? new Date(data.consentTimestamp)
          : now,
        metadata: data.numberOfBranches ? { numberOfBranches: data.numberOfBranches } : undefined,
        consentVersion: data.consentVersion ?? "lead-contact-consent-v1",
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        referrer,
        landingPage,
        ipAddress,
        userAgent,
      },
      update: {
        schoolName: data.schoolName,
        role: data.role,
        phone: data.phone || null,
        numberOfStudents: data.numberOfStudents,
        preferredContactMethod: data.preferredContactMethod,
        message: data.message || null,
        source: data.source,
        consentToContact: true,
        consentTimestamp: data.consentTimestamp
          ? new Date(data.consentTimestamp)
          : now,
        metadata: data.numberOfBranches ? { numberOfBranches: data.numberOfBranches } : undefined,
        consentVersion: data.consentVersion ?? "lead-contact-consent-v1",
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        referrer,
        landingPage,
        ipAddress,
        userAgent,
        updatedAt: now,
      },
    });

    // Send notification email (non-blocking — don't await)
    sendLeadNotification({
      fullName: lead.fullName,
      schoolName: lead.schoolName,
      role: lead.role,
      email: lead.email,
      phone: lead.phone,
      numberOfStudents: lead.numberOfStudents,
      preferredContactMethod: lead.preferredContactMethod,
      message: lead.message,
      source: lead.source,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      referrer: lead.referrer,
      landingPage: lead.landingPage,
      createdAt: lead.createdAt,
    }).catch((err) => {
      // Do not throw — lead is already saved
      console.warn("[leads] Email notification failed (async):", err);
    });

    // Sync to Resend Audience for broadcast emails (non-blocking)
    addLeadToAudience({
      email: lead.email,
      fullName: lead.fullName,
    }).catch((err) => {
      console.warn("[leads] Audience sync failed (async):", err);
    });

    // Send welcome email to the lead (non-blocking)
    sendEmail({
      to: lead.email,
      subject: "WardBalance — Demo Request Received!",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;margin:0;padding:0;background:#f9fafb">
  <table style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
    <tr>
      <td style="padding:32px 24px;background:#155EEF;color:#fff;text-align:center">
        <h2 style="margin:0;font-size:24px;font-weight:700;letter-spacing:-0.02em">Demo Request Received</h2>
        <p style="margin:8px 0 0;font-size:14px;color:#dbeafe">Simplifying school financial operations</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 24px;color:#1e293b;line-height:1.6;font-size:15px">
        <p style="margin:0 0 16px">Hi ${lead.fullName},</p>
        <p style="margin:0 0 16px">Thank you for requesting a demo of WardBalance! We have successfully received the request for your school: <strong>${lead.schoolName}</strong>.</p>
        <p style="margin:0 0 24px">Our team is preparing your workspace walkthrough and will reach out to you shortly to schedule a convenient time for a guided demo.</p>
        
        <table style="margin:0 auto">
          <tr>
            <td>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://wardbalance.com.ng"}" style="display:inline-block;padding:12px 24px;background:#155EEF;color:#fff;font-weight:700;text-decoration:none;border-radius:8px;font-size:14px">Visit Our Website</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;font-size:12px;color:#64748b">
        &copy; ${new Date().getFullYear()} WardBalance. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
      `
    }).catch((err) => {
      console.warn("[leads] Welcome email failed (async):", err);
    });

    return NextResponse.json(
      {
        data: { leadId: lead.id },
        message:
          "Thank you. We\u2019ll contact you shortly to learn more about your school\u2019s fee management needs.",
      },
      { status: 201 },
    );
  } catch (err) {
    // Handle database connection errors gracefully
    if (err instanceof Prisma.PrismaClientInitializationError) {
      console.error("[leads] Database connection failed:", err.message);
      return NextResponse.json(
        {
          error:
            "We're experiencing a temporary issue. Please try again in a few minutes.",
          code: "DATABASE_UNAVAILABLE",
        },
        { status: 503 },
      );
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation on email — should not happen with upsert,
      // but handle defensively
      if (err.code === "P2002") {
        console.error("[leads] Unique constraint violation:", err.message);
        return NextResponse.json(
          {
            error: "Something went wrong. Please try again.",
            code: "CONFLICT",
          },
          { status: 409 },
        );
      }
    }

    console.error("[leads] Unexpected error:", err);
    return NextResponse.json(
      {
        error: "Something went wrong. Please try again.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
