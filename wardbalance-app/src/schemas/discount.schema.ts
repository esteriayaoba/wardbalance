import { z } from "zod";

export const DiscountRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["fixed", "percentage"]),
  value: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Value must be a positive number"
  ),
  condition: z.enum(["sibling_count", "early_payment", "manual"]),
  scope: z.enum(["all_students", "specific_class", "specific_class_arm"]),
  conditionValue: z.string().nullable().optional(),
  feeItemId: z.string().nullable().optional(),
  classLevelId: z.string().nullable().optional(),
  classArmId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export type DiscountRuleInput = z.infer<typeof DiscountRuleSchema>;

export const DiscountRuleUpdateSchema = z.object({
  isActive: z.boolean(),
});
