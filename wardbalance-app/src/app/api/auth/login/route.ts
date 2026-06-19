import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signJWT } from "@/lib/auth/auth";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address").transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid credentials", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = parsed.data;

    // Find user by email and fetch school details
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

    // Compare password hash
    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again or use 'Forgot password' to reset it.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Session duration: 30 days if rememberMe, else 24 hours
    const sessionDuration = rememberMe ? "30d" : "24h";
    const cookieMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;

    const sessionPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      schoolId: user.schoolId,
      schoolName: user.school.name,
    };

    const token = await signJWT(sessionPayload, sessionDuration);

    const response = NextResponse.json({
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
      message: "Successfully logged in.",
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: cookieMaxAge,
    });

    return response;
  } catch (err) {
    console.error("[auth] Login error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
