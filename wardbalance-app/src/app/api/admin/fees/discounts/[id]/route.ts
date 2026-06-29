import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const DiscountRuleUpdateSchema = z.object({
  isActive: z.boolean(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !["SchoolOwner", "Bursar"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: ruleId } = await params;
    const body = await request.json();
    const parsed = DiscountRuleUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const existingRule = await prisma.discountRule.findFirst({
      where: { id: ruleId, schoolId: session.schoolId },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Discount rule not found" }, { status: 404 });
    }

    const updatedRule = await prisma.discountRule.update({
      where: { id: ruleId },
      data: { isActive: parsed.data.isActive },
    });

    await prisma.auditLog.create({
      data: {
        schoolId: session.schoolId,
        actorId: session.userId,
        actorName: session.fullName || "Admin",
        action: "DISCOUNT_RULE_UPDATED",
        entityType: "DiscountRule",
        entityId: ruleId,
        previousValue: JSON.parse(JSON.stringify(existingRule)),
        newValue: JSON.parse(JSON.stringify(updatedRule)),
      },
    });

    return NextResponse.json({ data: updatedRule });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update discount rule" }, { status: 500 });
  }
}
