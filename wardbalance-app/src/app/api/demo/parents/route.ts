import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production", code: "NOT_AVAILABLE" }, { status: 404 });
  }

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
  } catch {
    return NextResponse.json({ error: "Failed to load demo parents", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
