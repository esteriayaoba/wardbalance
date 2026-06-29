import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (session.role !== "SchoolOwner") {
      return NextResponse.json(
        { error: "Forbidden: Only the School Owner can view audit logs.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 1000);
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      data: auditLogs,
      meta: { count: auditLogs.length, limit },
    });
  } catch (err) {
    logError("audit", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
