import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ParentLoginSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("demo"),
    parentId: z.string().min(1, "Parent ID is required"),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ParentLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Demo Login Shortcut (used by dev parent login page for quick access)
    if (data.action === "demo") {
      const isProd = process.env.NODE_ENV === "production";
      if (isProd) {
        return NextResponse.json(
          { error: "Demo logins are disabled in production for security.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }

      const parent = await prisma.parent.findUnique({
        where: { id: data.parentId },
        include: {
          school: {
            select: { name: true },
          },
        },
      });

      if (!parent) {
        return NextResponse.json(
          { error: "Demo parent not found.", code: "NOT_FOUND" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        data: {
          parent: {
            id: parent.id,
            fullName: `${parent.firstName} ${parent.lastName}`,
            phone: parent.phone,
            email: parent.email,
            schoolId: parent.schoolId,
            schoolName: parent.school.name,
          },
        },
        message: "Demo parent found. Sign in via NextAuth.",
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("[parent-auth] Login error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
