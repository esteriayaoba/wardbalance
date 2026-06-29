import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/redis";
import { headers } from "next/headers";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
    const rl = await rateLimit(ip, { prefix: "rate_limit:verify_email", maxRequests: 10, windowSeconds: 900 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later.", code: "TOO_MANY_REQUESTS" },
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

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Verification code must be a 6-digit number.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const userId = session.userId;
    const schoolId = session.schoolId;

    // Fetch user details from database
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
        { message: "Email is already verified.", verified: true },
        { status: 200 }
      );
    }

    // Check attempts limit
    if (user.verificationAttempts >= 5) {
      // Log failed audit log entry for brute force risk
      await prisma.auditLog.create({
        data: {
          schoolId,
          actorId: userId,
          actorName: user.fullName,
          action: "auth.email_verification_failed",
          entityType: "User",
          entityId: userId,
          newValue: { reason: "max_attempts_exceeded" },
        },
      });

      return NextResponse.json(
        {
          error: "Too many failed attempts. Please request a new verification code.",
          code: "TOO_MANY_ATTEMPTS",
        },
        { status: 429 }
      );
    }

    // Check expiry
    if (
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt < new Date()
    ) {
      return NextResponse.json(
        {
          error: "Verification code has expired. Please request a new code.",
          code: "CODE_EXPIRED",
        },
        { status: 410 }
      );
    }

    // Compare hashed code
    const submittedHash = crypto.createHash("sha256").update(code).digest("hex");

    if (submittedHash !== user.verificationCodeHash) {
      const updatedAttempts = user.verificationAttempts + 1;
      
      await prisma.user.update({
        where: { id: userId },
        data: { verificationAttempts: updatedAttempts },
      });

      await prisma.auditLog.create({
        data: {
          schoolId,
          actorId: userId,
          actorName: user.fullName,
          action: "auth.email_verification_failed",
          entityType: "User",
          entityId: userId,
          newValue: { attempt: updatedAttempts, reason: "invalid_otp" },
        },
      });

      const remaining = 5 - updatedAttempts;
      return NextResponse.json(
        {
          error: remaining > 0 
            ? `Invalid verification code. You have ${remaining} attempts remaining.`
            : "Invalid code. Maximum attempts reached. Please request a new code.",
          code: "INVALID_CODE",
          remainingAttempts: remaining,
        },
        { status: 400 }
      );
    }

    // Verification successful! Update User
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          verificationCodeHash: null,
          verificationCodeExpiresAt: null,
          verificationAttempts: 0,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          actorId: userId,
          actorName: user.fullName,
          action: "auth.email_verified",
          entityType: "User",
          entityId: userId,
          newValue: { email: user.email },
        },
      });
    });

    console.log(`[Verify Email] User ${userId} verified email successfully.`);
    return NextResponse.json({
      message: "Email verified successfully.",
      verified: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
    console.error("[verify-email] POST error:", err);
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ emailVerified: false }, { status: 401 });
    }
    
    // Bypass for demo session
    if (session.isDemo) {
      return NextResponse.json({ emailVerified: true });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { emailVerified: true },
    });
    
    return NextResponse.json({ emailVerified: user?.emailVerified ?? false });
  } catch (err) {
    console.error("[verify-email] GET error:", err);
    return NextResponse.json({ emailVerified: false }, { status: 500 });
  }
}
