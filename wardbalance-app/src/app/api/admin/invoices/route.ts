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

    const { searchParams } = new URL(request.url);
    const termId = searchParams.get("termId");
    const classLevelId = searchParams.get("classLevelId");
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");

    const where: any = { schoolId: session.schoolId };
    if (termId) where.termId = termId;
    if (classLevelId) {
      where.student = { classLevelId };
    }
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        student: {
          include: {
            classLevel: true,
            classArm: true,
          },
        },
        term: {
          include: {
            session: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: invoices });
  } catch (err) {
    console.error("[invoices] GET error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
