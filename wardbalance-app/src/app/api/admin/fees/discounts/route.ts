import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const DiscountRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["fixed", "percentage"]),
  value: z.coerce.number().positive("Value must be positive"),
  condition: z.enum(["sibling_count", "early_payment", "manual"]),
  scope: z.enum(["all_students", "specific_class", "specific_class_arm"]),
  conditionValue: z.string().nullable().optional(),
  feeItemId: z.string().nullable().optional(),
  classLevelId: z.string().nullable().optional(),
  classArmId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SchoolOwner", "Bursar"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await prisma.discountRule.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: rules });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch discount rules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SchoolOwner", "Bursar"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = DiscountRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    const rule = await prisma.discountRule.create({
      data: {
        schoolId: session.schoolId,
        name: data.name,
        type: data.type,
        value: data.value,
        condition: data.condition,
        scope: data.scope,
        conditionValue: data.conditionValue,
        feeItemId: data.feeItemId,
        classLevelId: data.classLevelId,
        classArmId: data.classArmId,
        isActive: data.isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: session.schoolId,
        actorId: session.userId,
        actorName: session.fullName || "Admin",
        action: "DISCOUNT_RULE_CREATED",
        entityType: "DiscountRule",
        entityId: rule.id,
        newValue: JSON.parse(JSON.stringify(rule)),
      },
    });

    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create discount rule" }, { status: 500 });
  }
}
