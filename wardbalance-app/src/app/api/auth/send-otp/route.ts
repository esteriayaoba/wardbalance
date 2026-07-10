import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upstashSet, rateLimit } from "@/lib/redis";
import { sendEmail } from "@/lib/email/resend";
import { sendTermiiSMS } from "@/lib/termii";
import { headers } from "next/headers";
import crypto from "crypto";
import { z } from "zod";

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
      // Generate 6-digit OTP
      const rawOtp = crypto.randomInt(100000, 1000000).toString();

      // Hash before storing — the plaintext OTP is NEVER persisted.
      // Key is scoped by schoolId to prevent cross-tenant auth (R-1).
      const otpHash = crypto.createHash("sha256").update(rawOtp).digest("hex");
      const key = `otp:${parent.schoolId}:${input}`;

      await upstashSet(key, otpHash, 300); // 5 minutes expiry

      // Send OTP via email if available
      const emailTarget = parent.email;
      if (emailTarget) {
        sendEmail({
          to: emailTarget,
          subject: "Your WardBalance Parent Portal Login Code",
          html: `
            <h1>Login Code</h1>
            <p>Your verification code is:</p>
            <h2 style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #155EEF; margin: 16px 0;">${rawOtp}</h2>
            <p>This code expires in 5 minutes.</p>
            <p>If you did not request this code, please ignore this email.</p>
          `,
        }).catch((err) => console.warn("[send-otp] Email failed:", err));
      }

      // Send SMS if input looks like a phone number
      if (input.replace(/[\s+\-]/g, "").match(/^(\d{10,15})$/)) {
        sendTermiiSMS(input, `Your WardBalance login code is: ${rawOtp}. It expires in 5 minutes.`)
          .catch((err) => console.warn("[send-otp] SMS failed:", err));
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
