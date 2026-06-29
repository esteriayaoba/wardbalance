import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJWT } from "@/lib/auth/auth";
import { z } from "zod";

const ParentLoginSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    phoneOrEmail: z.string().min(1, "Phone number or email is required"),
  }),
  z.object({
    action: z.literal("verify"),
    phoneOrEmail: z.string().min(1, "Phone number or email is required"),
    otp: z.string().length(6, "OTP must be exactly 6 digits"),
  }),
  z.object({
    action: z.literal("demo"),
    parentId: z.string().min(1, "Parent ID is required"),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ParentLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // STEP 1: Request OTP
    if (data.action === "request") {
      const input = data.phoneOrEmail.trim().toLowerCase();

      // Find parent by email or phone
      const parent = await prisma.parent.findFirst({
        where: {
          OR: [
            { email: input },
            { phone: input },
            { phone: { endsWith: input.replace(/^\+?234/, "") } }, // Relaxed phone matching for Nigeria
          ],
        },
      });

      if (!parent) {
        return NextResponse.json(
          { error: "No parent record found with that contact info. Please contact your school administrator.", code: "NOT_FOUND" },
          { status: 404 }
        );
      }

      const isProd = process.env.NODE_ENV === "production";
      const message = isProd 
        ? "Verification code sent successfully. Please check your registered email or phone."
        : "OTP sent successfully. For demo purposes, use code: 123456";

      // In a real app, send actual SMS/Email. For Phase 2A/3 UI scaffolding, we mock it.
      console.log(`[Parent Auth] Generated OTP 123456 for parent ${parent.firstName} ${parent.lastName}`);

      return NextResponse.json({
        data: {
          success: true,
          message,
        },
      });
    }

    // STEP 2: Verify OTP
    if (data.action === "verify") {
      const input = data.phoneOrEmail.trim().toLowerCase();
      const { otp } = data;

      const isProd = process.env.NODE_ENV === "production";

      if (isProd) {
        // In production, mock OTP verification is strictly disabled
        return NextResponse.json(
          { error: "Secure OTP system is active. Production parent logins must use a verified email/SMS integration.", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }

      if (otp !== "123456") {
        return NextResponse.json(
          { error: "Incorrect OTP. Please enter the code sent to your device.", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }

      const parent = await prisma.parent.findFirst({
        where: {
          OR: [
            { email: input },
            { phone: input },
          ],
        },
        include: {
          school: {
            select: { name: true },
          },
        },
      });

      if (!parent) {
        return NextResponse.json(
          { error: "Parent profile not found.", code: "NOT_FOUND" },
          { status: 404 }
        );
      }

      return issueParentSession(parent);
    }

    // STEP 3: Demo Login Shortcut
    if (data.action === "demo") {
      const isProd = process.env.NODE_ENV === "production";
      if (isProd) {
        return NextResponse.json(
          { error: "Demo logins are disabled in production for security.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }

      const parent = await prisma.parent.findUnique({
        where: { id: data.parentId },
        include: {
          school: {
            select: { name: true },
          },
        },
      });

      if (!parent) {
        return NextResponse.json(
          { error: "Demo parent not found.", code: "NOT_FOUND" },
          { status: 404 }
        );
      }

      return issueParentSession(parent);
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    console.error("[parent-auth] Login error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

async function issueParentSession(parent: any) {
  const sessionPayload = {
    userId: parent.id, // Stores parent ID in userId
    email: parent.email || `${parent.phone}@wardbalance.local`,
    fullName: `${parent.firstName} ${parent.lastName}`,
    role: "Parent",
    schoolId: parent.schoolId,
    schoolName: parent.school.name,
  };

  const token = await signJWT(sessionPayload, "24h");

  const response = NextResponse.json({
    data: {
      parent: {
        id: parent.id,
        fullName: sessionPayload.fullName,
        role: "Parent",
        schoolId: parent.schoolId,
        schoolName: parent.school.name,
      },
    },
    message: "Successfully logged in.",
  });

  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}
