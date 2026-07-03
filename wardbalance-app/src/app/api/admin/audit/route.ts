import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 1000);
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");
    const actorName = searchParams.get("actor");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const where: Record<string, unknown> = { schoolId: guard.session.schoolId };
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (actorName) where.actorName = { contains: actorName, mode: "insensitive" };

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) createdAt.lte = new Date(endDate);
      where.createdAt = createdAt;
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      data: auditLogs,
      meta: { count: auditLogs.length, total, limit, offset },
    });
  } catch (err) {
    logError("audit", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
