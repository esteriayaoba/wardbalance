import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { parsePagination, paginatedJsonResponse } from "@/lib/server/pagination";
import { logError } from "@/lib/logger";
import { Prisma, InvoiceStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Principal", "Bursar", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const termId = searchParams.get("termId");
    const classLevelId = searchParams.get("classLevelId");
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Prisma.InvoiceWhereInput = { schoolId: guard.session.schoolId };
    if (termId) where.termId = termId;
    if (classLevelId) {
      where.student = { classLevelId };
    }
    if (studentId) where.studentId = studentId;
    if (status) where.status = status as InvoiceStatus;
    if (search) {
      where.OR = [
        { student: { firstName: { contains: search, mode: "insensitive" } } },
        { student: { lastName: { contains: search, mode: "insensitive" } } },
        { student: { admissionNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    const { limit, offset } = parsePagination(searchParams);

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          student: {
            include: {
              classLevel: { select: { name: true } },
              classArm: { select: { name: true } },
            },
          },
          term: { select: { name: true, session: { select: { name: true } } } },
          payments: {
            where: { status: "recorded" },
            select: { amount: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json(paginatedJsonResponse(invoices, total, limit, offset));
  } catch (err) {
    logError("invoices GET", err);
    return NextResponse.json({ error: "Failed to fetch invoices", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
