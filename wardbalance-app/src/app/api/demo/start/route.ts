import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { seedDemoSchool } from "@/lib/demo/seeder";
import { prisma } from "@/lib/prisma";
import { signJWT } from "@/lib/auth/auth";

export async function POST() {
  try {
    const { schoolId, userId } = await seedDemoSchool();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { school: { select: { name: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "Demo user not found" }, { status: 500 });
    }

    const token = await signJWT(
      {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        schoolId: user.schoolId,
        schoolName: user.school.name,
        isDemo: true,
      },
      "2h"
    );

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 2, // 2 hours
    });

    return NextResponse.json({ redirectTo: "/admin/dashboard" });
  } catch (err) {
    console.error("[demo/start] Failed to start demo:", err);
    return NextResponse.json({ error: "Failed to start demo" }, { status: 500 });
  }
}
