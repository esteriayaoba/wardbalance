import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SchoolSignupSchema } from "@/modules/signup/signup.schema";
import { encryptPassword } from "@/lib/auth/auth";
import { upstashIncr } from "@/lib/redis";
import { sendEmail } from "@/lib/email/resend";
import { headers } from "next/headers";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
    const rateLimitKey = `rate_limit:signup:${ipAddress}`;
    
    const requestCount = await upstashIncr(rateLimitKey, 3600);
    if (requestCount !== null && requestCount > 5) {
      return NextResponse.json(
        {
          error: "Too many signup attempts. Please try again in an hour.",
          code: "TOO_MANY_REQUESTS",
        },
        { status: 429 }
      );
    }

    // 2. Validate request body
    const body = await request.json();
    const parsed = SchoolSignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid signup data",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Default optional fields for backward compatibility
    const schoolType = data.schoolType ?? "Other";
    const estimatedStudents = data.estimatedStudents ?? 50;

    // 3. Check duplicate user email
    const existingUser = await prisma.user.findUnique({
      where: { email: data.ownerEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        {
          error: "An account with this email already exists. Please sign in or use a different email.",
          code: "DUPLICATE",
        },
        { status: 409 }
      );
    }

    // 4. Check if duplicate school name with this owner email exists
    const existingSchool = await prisma.school.findFirst({
      where: {
        name: data.schoolName,
        email: data.ownerEmail,
      },
    });
    if (existingSchool) {
      return NextResponse.json(
        {
          error: "A school workspace with these details may already exist. Please sign in or contact support.",
          code: "DUPLICATE",
        },
        { status: 409 }
      );
    }

    // 5. Hash owner password
    const passwordHash = await encryptPassword(data.password);

    // Generate secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash("sha256").update(rawOtp).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 6. Execute database transaction
    const { school, user } = await prisma.$transaction(async (tx) => {
      const createdSchool = await tx.school.create({
        data: {
          name: data.schoolName,
          email: data.ownerEmail,
          phone: data.ownerPhone,
          estimatedStudents: String(estimatedStudents),
          status: "onboarding",
          selectedPlan: data.plan ?? "freemium",
          planStatus: "active",
          planStartedAt: new Date(),
          planLimits: {
            maxStudents: data.plan === "freemium" ? 50 : 500,
            maxStaff: data.plan === "freemium" ? 1 : 5,
            paymentMethods: data.plan === "freemium" ? "manual" : "all",
            reports: data.plan === "freemium" ? "basic" : "advanced",
          },
        },
      });

      const createdUser = await tx.user.create({
        data: {
          schoolId: createdSchool.id,
          email: data.ownerEmail,
          passwordHash,
          fullName: data.ownerFullName,
          role: "SchoolOwner",
          emailVerified: false,
          verificationCodeHash: codeHash,
          verificationCodeExpiresAt: expiresAt,
          verificationAttempts: 0,
          lastVerificationSentAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: createdSchool.id,
          actorId: createdUser.id,
          actorName: createdUser.fullName,
          action: "create_school_workspace",
          entityType: "School",
          entityId: createdSchool.id,
          newValue: {
            schoolName: createdSchool.name,
            ownerEmail: createdUser.email,
            selectedPlan: createdSchool.selectedPlan,
            status: createdSchool.status,
            schoolType,
          },
        },
      });

      return { school: createdSchool, user: createdUser };
    });

    // 7. Send Emails (Non-blocking)
    const welcomeHtml = `
      <h1>Welcome to WardBalance, ${user.fullName}!</h1>
      <p>Your school workspace <strong>${school.name}</strong> has been created successfully.</p>
      <p>Your email verification code is:</p>
      <h2 style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #155EEF; margin: 16px 0;">${rawOtp}</h2>
      <p>Please click the following link to verify your email and unlock financial actions:</p>
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/verify-email" style="display: inline-block; padding: 10px 20px; background-color: #155EEF; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a></p>
      <p>Or manually enter the code on the verification page.</p>
      <p>Please complete your onboarding checklist to start recording fee items and generating invoices.</p>
      <p>If you need any help getting started, reply to this email — we&apos;re here.</p>
    `;
    sendEmail({
      to: user.email,
      subject: "Welcome to WardBalance - School Workspace Created",
      html: welcomeHtml,
    }).catch((err) => console.warn("[signup] Welcome email failed:", err));

    const adminNotificationHtml = `
      <h2>New School Registered (Self-Service)</h2>
      <p><strong>School Name:</strong> ${school.name}</p>
      <p><strong>Owner Name:</strong> ${user.fullName}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Phone:</strong> ${school.phone}</p>
      <p><strong>Selected Plan:</strong> ${school.selectedPlan}</p>
      <p><strong>Estimated Students:</strong> ${school.estimatedStudents}</p>
    `;
    const notificationEmail = process.env.LEAD_NOTIFICATION_EMAIL;
    if (notificationEmail) {
      sendEmail({
        to: notificationEmail,
        subject: `New School Signup: ${school.name}`,
        html: adminNotificationHtml,
      }).catch((err) => console.warn("[signup] Admin notification email failed:", err));
    }

    // 8. Build response (no manual session cookie — NextAuth handles this)
    const response = NextResponse.json({
      data: {
        school: {
          id: school.id,
          name: school.name,
          selectedPlan: school.selectedPlan,
          status: school.status,
        },
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      },
      message: "School workspace and admin account created successfully.",
      redirectTo: "/admin/verify-email",
    });

    if (process.env.NODE_ENV !== "production") {
      response.cookies.set("dev_otp", rawOtp, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 15,
      });
    }

    return response;
  } catch (err) {
    console.error("[signup] Unexpected error:", err);
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
