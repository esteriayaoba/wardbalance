import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { DiscountRuleUpdateSchema } from "@/modules/discounts/schemas";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const { id: ruleId } = await params;
    const body = await request.json();
    const parsed = DiscountRuleUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const existingRule = await prisma.discountRule.findFirst({
      where: { id: ruleId, schoolId: guard.session.schoolId },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Discount rule not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const [updatedRule] = await prisma.$transaction(async (tx) => {
      const updated = await tx.discountRule.update({
        where: { id: ruleId },
        data: { isActive: parsed.data.isActive },
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName || "Admin",
          action: "DISCOUNT_RULE_UPDATED",
          entityType: "DiscountRule",
          entityId: ruleId,
          previousValue: JSON.parse(JSON.stringify(existingRule)),
          newValue: JSON.parse(JSON.stringify(updated)),
        },
      });

      return [updated];
    });

    return NextResponse.json({ data: updatedRule });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update discount rule", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
