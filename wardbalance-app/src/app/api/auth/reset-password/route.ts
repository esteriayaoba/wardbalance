import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upstashGet, upstashDel, rateLimit } from "@/lib/redis";
import { encryptPassword } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { logError } from "@/lib/logger";

const Schema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[^a-zA-Z0-9\s]/, "Password must contain at least one special character"),
});

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
    const rl = await rateLimit(ip, { prefix: "rate_limit:reset_password", maxRequests: 5, windowSeconds: 900 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many password reset attempts. Please try again later.", code: "TOO_MANY_REQUESTS" },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;
    const resetKey = `pwd_reset:${token}`;

    // Retrieve and validate token from Redis
    const userId = await upstashGet(resetKey);
    if (!userId) {
      return NextResponse.json(
        { error: "This reset link has expired or is invalid. Please request a new one.", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await encryptPassword(password);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Update user password + write audit log in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      await tx.auditLog.create({
        data: {
          schoolId: user?.schoolId || "",
          actorId: userId,
          actorName: "System (Password Reset)",
          action: "auth.password_reset",
          entityType: "User",
          entityId: userId,
          newValue: { email: user?.email },
        },
      });
    });

    // Invalidate the token — single use only
    await upstashDel(resetKey);

    return NextResponse.json({ message: "Password updated successfully. You can now sign in." });
  } catch (err) {
    logError("[reset-password] Error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
