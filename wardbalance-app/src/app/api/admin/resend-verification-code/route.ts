import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";
import { rateLimit } from "@/lib/redis";
import { headers } from "next/headers";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
    const rl = await rateLimit(ip, { prefix: "rate_limit:resend_verification", maxRequests: 5, windowSeconds: 900 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many resend requests. Please try again later.", code: "TOO_MANY_REQUESTS" },
        { status: 429 },
      );
    }

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = session.userId;
    const schoolId = session.schoolId;

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified.", code: "ALREADY_VERIFIED" },
        { status: 400 }
      );
    }

    // Enforce resend cooldown (60 seconds)
    const COOLDOWN_MS = 60 * 1000;
    if (user.lastVerificationSentAt) {
      const timePassed = Date.now() - user.lastVerificationSentAt.getTime();
      if (timePassed < COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((COOLDOWN_MS - timePassed) / 1000);
        return NextResponse.json(
          {
            error: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
            code: "RATE_LIMITED",
            retryAfter: remainingSeconds,
          },
          { status: 429 }
        );
      }
    }

    // Generate secure 6-digit OTP code
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash("sha256").update(rawOtp).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    // Save hashed code in database
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          verificationCodeHash: codeHash,
          verificationCodeExpiresAt: expiresAt,
          verificationAttempts: 0,
          lastVerificationSentAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorId: userId,
          actorName: user.fullName,
          action: "auth.email_verification_resent",
          entityType: "User",
          entityId: userId,
          newValue: { email: user.email },
        },
      });
    });

    // Send email with OTP (Non-blocking)
    const emailHtml = `
      <h1>WardBalance Email Verification</h1>
      <p>Hello ${user.fullName},</p>
      <p>A request was made to send a new email verification code for your school workspace.</p>
      <p>Your new email verification code is:</p>
      <h2 style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #155EEF; margin: 16px 0;">${rawOtp}</h2>
      <p>Enter this code on the verification page to unlock sensitive financial actions.</p>
      <p>This code will expire in 15 minutes.</p>
    `;

    sendEmail({
      to: user.email,
      subject: "WardBalance Email Verification Code",
      html: emailHtml,
    }).catch((err) => console.warn("[resend-otp] Resend email failed:", err));

    console.log(`[Resend OTP] Sent new code to user ${userId}.`);
    const response = NextResponse.json({
      message: "A new verification code has been sent if your account is eligible.",
      success: true,
    });

    if (process.env.NODE_ENV !== "production") {
      response.cookies.set("dev_otp", rawOtp, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 15, // 15 minutes
      });
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
    console.error("[resend-otp] POST error:", err);
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
