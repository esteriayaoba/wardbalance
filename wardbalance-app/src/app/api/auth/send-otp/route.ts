import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/redis";
import { sendEmail } from "@/lib/email/resend";
import { sendTermiiSMS } from "@/lib/termii";
import { headers } from "next/headers";
import { z } from "zod";
import { OtpService } from "@/lib/auth/otp.service";

const SendOtpSchema = z.object({
  phoneOrEmail: z.string().min(1, "Phone number or email is required"),
});

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
    const rl = await rateLimit(ip, { prefix: "rate_limit:send_otp", maxRequests: 5, windowSeconds: 300 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again later.", code: "TOO_MANY_REQUESTS" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = SendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const input = parsed.data.phoneOrEmail.trim().toLowerCase();

    // Scope parent lookup — return the same generic error regardless of outcome
    // to avoid leaking whether a contact exists (anti-enumeration).
    const parent = await prisma.parent.findFirst({
      where: {
        OR: [
          { email: input },
          { phone: input },
          { phone: { endsWith: input.replace(/^\+?234/, "") } },
        ],
      },
      select: { id: true, schoolId: true, email: true, phone: true },
    });

    const isProd = process.env.NODE_ENV === "production";

    if (parent) {
      // 1. Check failed verification lockout status
      const lockout = await OtpService.checkLockout(parent.schoolId, input);
      if (lockout.locked) {
        const minutes = Math.ceil(lockout.remainingSeconds / 60);
        return NextResponse.json(
          { error: `Too many failed attempts. Try again in ${minutes} minutes.`, code: "LOCKED" },
          { status: 423 }
        );
      }

      // 2. Generate secure 6-digit OTP using the unified OtpService (expires in 10 minutes)
      const { otp: rawOtp } = await OtpService.generateOtp(parent.schoolId, input);

      // 3. Send OTP via email if available (updated message and expiry time)
      const emailTarget = parent.email;
      if (emailTarget) {
        sendEmail({
          to: emailTarget,
          subject: "Your WardBalance Parent Portal Login Code",
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #155EEF; margin-top: 0;">Verification Code</h2>
              <p>Your WardBalance login verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #155EEF; margin: 24px 0; text-align: center; background: #eff6ff; padding: 12px; border-radius: 6px; font-family: monospace;">${rawOtp}</div>
              <p style="color: #475569; font-size: 14px;">This code expires in 10 minutes. Never share this code with anyone. If you didn't request it, you can safely ignore this email.</p>
            </div>
          `,
        }).catch((err) => console.warn("[send-otp] Email failed:", err));
      }

      // 4. Send SMS if input looks like a phone number (updated to standard approved Termii copy)
      if (input.replace(/[\s+\-]/g, "").match(/^(\d{10,15})$/)) {
        sendTermiiSMS(
          input,
          `WardBalance: Your verification code is ${rawOtp}. It expires in 10 minutes. Never share this code with anyone. If you didn't request it, you can safely ignore this message.`
        ).catch((err) => console.warn("[send-otp] SMS failed:", err));
      }

      if (!isProd) {
        return NextResponse.json({
          data: { success: true, message: "If an account exists, an OTP has been sent.", devOtp: rawOtp },
        });
      }
    }

    return NextResponse.json({
      data: { success: true, message: "If an account exists, an OTP has been sent." },
    });
  } catch (err: unknown) {
    console.error("[send-otp] Error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
