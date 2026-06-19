import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptPassword, signJWT } from "@/lib/auth/auth";
import { z } from "zod";

const AcceptInviteSchema = z.object({
  token: z.string().min(1, "Token is required"),
  fullName: z.string().min(1, "Full name is required").max(120),
  schoolName: z.string().min(1, "School name is required").max(160),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = AcceptInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { token, fullName, schoolName, password } = parsed.data;

    // Run verification and user creation inside a Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch and validate invitation
      const invite = await tx.invitation.findUnique({
        where: { token },
      });

      if (!invite) {
        throw new Error("Invitation token is invalid or does not exist");
      }

      if (invite.usedAt) {
        throw new Error("This invitation has already been used");
      }

      if (invite.expiresAt < new Date()) {
        throw new Error("This invitation has expired");
      }

      // 2. Hash password
      const passwordHash = await encryptPassword(password);

      // 3. Create User record
      const user = await tx.user.create({
        data: {
          schoolId: invite.schoolId,
          email: invite.email,
          fullName,
          passwordHash,
          role: invite.role,
        },
      });

      // 4. Mark invitation as used
      await tx.invitation.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });

      // 5. Update School status to onboarding and set official name
      const school = await tx.school.update({
        where: { id: invite.schoolId },
        data: {
          name: schoolName,
          status: "onboarding", // Move to onboarding checklist state
        },
      });

      // 6. Write to AuditLog
      await tx.auditLog.create({
        data: {
          schoolId: school.id,
          actorId: user.id,
          actorName: user.fullName,
          action: "INVITATION_ACCEPTED",
          entityType: "User",
          entityId: user.id,
          newValue: {
            fullName: user.fullName,
            role: user.role,
            schoolName: school.name,
          },
        },
      });

      return {
        user,
        school,
      };
    });

    // Sign session JWT
    const sessionPayload = {
      userId: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
      schoolId: result.school.id,
      schoolName: result.school.name,
    };

    const tokenJWT = await signJWT(sessionPayload);

    // Set HttpOnly session cookie
    const response = NextResponse.json({
      data: {
        userId: result.user.id,
        schoolId: result.school.id,
      },
      message: "Password setup complete. Logging in...",
    });

    response.cookies.set("session", tokenJWT, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (err: any) {
    console.error("[invite] Acceptance error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to accept invitation", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
