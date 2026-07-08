import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";
import { z } from "zod";
import crypto from "crypto";

const InviteUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["SchoolOwner", "Principal", "Bursar", "Admin"]),
});

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = InviteUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;
    const schoolId = guard.session.schoolId;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists in the system.", code: "CONFLICT" },
        { status: 409 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.invitation.create({
      data: { schoolId, email: email.toLowerCase().trim(), role, token, expiresAt },
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite?token=${token}`;

    await sendEmail({
      to: email,
      subject: "You've Been Invited to WardBalance",
      html: `
        <h1>Team Invitation</h1>
        <p>You have been invited to join <strong>${guard.session.schoolName}</strong> on WardBalance as a <strong>${role.replace(/([A-Z])/g, " $1").trim()}</strong>.</p>
        <p>Click the link below to accept your invitation and set up your account:</p>
        <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #155EEF; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">
          Accept Invitation
        </a>
        <p>This link expires in 7 days.</p>
        <p>If you did not expect this invitation, please ignore this email.</p>
      `,
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId: guard.session.userId,
        actorName: guard.session.fullName,
        action: "USER_INVITED",
        entityType: "Invitation",
        entityId: invitation.id,
        newValue: { email, role },
      },
    });

    return NextResponse.json(
      { data: { email, role }, message: `Invitation sent to ${email}.` },
      { status: 201 }
    );
  } catch (err) {
    console.error("[users] Invite error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
