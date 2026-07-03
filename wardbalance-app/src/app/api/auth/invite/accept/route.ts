import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptPassword } from "@/lib/auth/auth";
import { rateLimit } from "@/lib/redis";
import { headers } from "next/headers";
import { z } from "zod";

const AcceptInviteSchema = z.object({
  token: z.string().min(1, "Token is required"),
  fullName: z.string().min(1, "Full name is required").max(120),
  schoolName: z.string().min(1, "School name is required").max(160),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
    const rl = await rateLimit(ip, { prefix: "rate_limit:invite_accept", maxRequests: 10, windowSeconds: 900 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later.", code: "TOO_MANY_REQUESTS" },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = AcceptInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { token, fullName, schoolName, password } = parsed.data;

    await prisma.$transaction(async (tx) => {
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

      const passwordHash = await encryptPassword(password);

      const user = await tx.user.create({
        data: {
          schoolId: invite.schoolId,
          email: invite.email,
          fullName,
          passwordHash,
          role: invite.role,
        },
      });

      await tx.invitation.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });

      const school = await tx.school.update({
        where: { id: invite.schoolId },
        data: {
          name: schoolName,
          status: "onboarding",
        },
      });

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
    });

    return NextResponse.json({
      data: { success: true },
      message: "Password setup complete. Redirecting to your workspace...",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to accept invitation";
    console.error("[invite] Acceptance error:", err);
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
