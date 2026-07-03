import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth/auth";
import { rateLimit } from "@/lib/redis";
import { headers } from "next/headers";
import { z } from "zod";

// DEPRECATED: Login is now handled by NextAuth via /api/auth/[...nextauth].
// This route is kept for backward compatibility only.

const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address").transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
    const rl = await rateLimit(ip, { prefix: "rate_limit:login", maxRequests: 10, windowSeconds: 900 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later.", code: "TOO_MANY_REQUESTS" },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(rl.resetAt) } },
      );
    }

    const body = await request.json();

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid credentials", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        school: {
          select: { name: true, status: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with that email address. Please check and try again.", code: "NOT_FOUND" },
        { status: 401 }
      );
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again or use 'Forgot password' to reset it.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          schoolId: user.schoolId,
          schoolName: user.school.name,
          schoolStatus: user.school.status,
        },
      },
      message: "Login is now handled by NextAuth. Please use /api/auth/signin instead.",
    });
  } catch (err) {
    console.error("[auth] Login error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
