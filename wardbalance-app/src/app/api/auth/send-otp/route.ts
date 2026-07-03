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

    const parent = await prisma.parent.findFirst({
      where: {
        OR: [
          { email: input },
          { phone: input },
          { phone: { endsWith: input.replace(/^\+?234/, "") } },
        ],
      },
    });

    if (!parent) {
      return NextResponse.json(
        { error: "No parent record found with that contact info. Please contact your school administrator.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const key = `otp:${input}`;

    await upstashSet(key, otp, 300); // 5 minutes expiry

    const isProd = process.env.NODE_ENV === "production";

    // Send OTP
    const emailTarget = parent.email;
    if (emailTarget) {
      sendEmail({
        to: emailTarget,
        subject: "Your WardBalance Parent Portal Login Code",
        html: `
          <h1>Login Code</h1>
          <p>Your verification code is:</p>
          <h2 style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #155EEF; margin: 16px 0;">${otp}</h2>
          <p>This code expires in 5 minutes.</p>
          <p>If you did not request this code, please ignore this email.</p>
        `,
      }).catch((err) => console.warn("[send-otp] Email failed:", err));
    }

    // Send SMS if input looks like a phone
    if (input.replace(/[\s+\-]/g, "").match(/^(\d{10,15})$/)) {
      sendTermiiSMS(input, `Your WardBalance login code is: ${otp}. It expires in 5 minutes.`)
        .catch((err) => console.warn("[send-otp] SMS failed:", err));
    }

    const message = isProd
      ? "Verification code sent successfully. Please check your registered email or phone."
      : `OTP sent successfully. For demo purposes, use code: ${otp}`;

    const response: { data: { success: boolean; message: string; devOtp?: string } } = {
      data: { success: true, message },
    };

    if (!isProd) {
      response.data.devOtp = otp;
    }

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("[send-otp] Error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
