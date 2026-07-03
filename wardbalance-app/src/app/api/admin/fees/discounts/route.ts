import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { DiscountRuleSchema } from "@/schemas/discount.schema";

export async function GET(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const rules = await prisma.discountRule.findMany({
      where: { schoolId: guard.session.schoolId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: rules });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch discount rules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = DiscountRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const data = parsed.data;

    const [rule] = await prisma.$transaction(async (tx) => {
      const rule = await tx.discountRule.create({
        data: {
          schoolId: guard.session.schoolId,
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

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName || "Admin",
          action: "DISCOUNT_RULE_CREATED",
          entityType: "DiscountRule",
          entityId: rule.id,
          newValue: JSON.parse(JSON.stringify(rule)),
        },
      });

      return [rule];
    });

    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create discount rule", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
