import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { CreateLeadSchema } from "@/modules/leads/lead.schema";
import { sendLeadNotification } from "@/modules/leads/send-lead-notification";
import { rateLimit } from "@/lib/redis";
import { headers } from "next/headers";

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
