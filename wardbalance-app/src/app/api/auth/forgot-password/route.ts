import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upstashSet, rateLimit } from "@/lib/redis";
import { sendEmail } from "@/lib/email/resend";
import { headers } from "next/headers";
import { z } from "zod";
import { randomBytes } from "crypto";

const Schema = z.object({
  email: z.string().email("Please enter a valid email address").transform((v) => v.toLowerCase().trim()),
});

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
    const rl = await rateLimit(ip, { prefix: "rate_limit:forgot_password", maxRequests: 5, windowSeconds: 900 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many password reset requests. Please try again later.", code: "TOO_MANY_REQUESTS" },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid email", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = randomBytes(32).toString("hex");
      const resetKey = `pwd_reset:${token}`;

      // Store token → userId in Redis for 1 hour
      await upstashSet(resetKey, user.id, 3600);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const resetLink = `${appUrl}/reset-password?token=${token}`;

      await sendEmail({
        to: email,
        subject: "Reset your WardBalance password",
        html: `
          <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
            <div style="margin-bottom:24px;display:flex;align-items:center;gap:8px;">
              <span style="font-size:20px;font-weight:700;color:#155EEF;letter-spacing:-0.3px;">🛡 WardBalance</span>
            </div>
            <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px;">Reset your password</h1>
            <p style="font-size:14px;color:#6B7280;line-height:1.6;margin:0 0 24px;">
              We received a request to reset the password for your WardBalance account (<strong>${email}</strong>).
              Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
            </p>
            <a href="${resetLink}" style="display:inline-block;padding:12px 28px;background:#155EEF;color:#ffffff;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;margin-bottom:24px;">
              Reset Password
            </a>
            <p style="font-size:12px;color:#9CA3AF;line-height:1.6;margin:0;">
              If you did not request a password reset, you can safely ignore this email — your password will not change.
            </p>
          </div>
        `,
      }).catch((err) => console.warn("[forgot-password] Email send failed:", err));
    }

    // Always return 200 regardless to prevent email enumeration attacks
    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("[forgot-password] Error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
