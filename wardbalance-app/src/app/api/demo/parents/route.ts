import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const parents = await prisma.parent.findMany({
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        school: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({ data: parents });
  } catch (err: any) {
    console.error("[demo/parents] GET error:", err);
    return NextResponse.json({ error: "Failed to load demo parents" }, { status: 500 });
  }
}
