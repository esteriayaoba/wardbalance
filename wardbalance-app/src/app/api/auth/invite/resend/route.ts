import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/resend";
import { z } from "zod";
import crypto from "crypto";

const ResendSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ResendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    const existing = await prisma.invitation.findUnique({
      where: { token },
      include: { school: { select: { name: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Invitation not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (existing.usedAt) {
      return NextResponse.json(
        { error: "This invitation has already been used", code: "ALREADY_USED" },
        { status: 400 }
      );
    }

    const newToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: existing.id },
        data: { token: newToken, expiresAt },
      });

      await tx.auditLog.create({
        data: {
          schoolId: existing.schoolId,
          actorId: "system",
          actorName: "Invitation Resend",
          action: "INVITATION_RESENT",
          entityType: "Invitation",
          entityId: existing.id,
          newValue: { email: existing.email, role: existing.role },
        },
      });
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite?token=${newToken}`;

    await sendEmail({
      to: existing.email,
      subject: "Invitation to WardBalance (Resent)",
      html: `
        <h1>You're Invited to WardBalance</h1>
        <p>You have been invited to set up <strong>${existing.school.name}</strong> on WardBalance.</p>
        <p>Click the link below to accept your invitation:</p>
        <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #155EEF; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">
          Accept Invitation
        </a>
        <p>This link expires in 7 days.</p>
        <p>If you did not expect this invitation, please ignore this email.</p>
      `,
    });

    return NextResponse.json({
      data: { email: existing.email },
      message: "Invitation resent successfully.",
    });
  } catch (err) {
    console.error("[invite] Resend error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
