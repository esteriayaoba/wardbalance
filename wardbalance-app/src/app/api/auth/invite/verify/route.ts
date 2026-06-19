import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const invite = await prisma.invitation.findUnique({
      where: { token },
      include: {
        school: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invitation not found or invalid", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (invite.usedAt) {
      return NextResponse.json(
        { error: "This invitation has already been used", code: "ALREADY_USED" },
        { status: 400 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired", code: "EXPIRED" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        email: invite.email,
        role: invite.role,
        schoolName: invite.school.name,
      },
    });
  } catch (err) {
    console.error("[invite] Verify error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
