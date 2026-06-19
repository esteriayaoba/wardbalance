import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Protect Audit Logs endpoint - only SchoolOwner can view audit logs
    if (session.role !== "SchoolOwner") {
      return NextResponse.json(
        { error: "Forbidden: Only the School Owner can view workspace audit logs.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { createdAt: "desc" },
      take: 200, // retrieve last 200 log records
    });

    return NextResponse.json({ data: auditLogs });
  } catch (err) {
    console.error("[audit] GET error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
