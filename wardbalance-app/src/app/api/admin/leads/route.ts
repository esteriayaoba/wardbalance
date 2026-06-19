import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: leads });
  } catch (err) {
    console.error("[leads] Fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch leads", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
