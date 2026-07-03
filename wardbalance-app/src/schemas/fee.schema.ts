import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

export const FeeItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(["mandatory", "optional"]).default("mandatory"),
  billingFrequency: z.enum(["per_term", "per_session", "one_off"]).default("per_term"),
  amount: z.union([z.number(), z.string()]).transform((val) => {
    const decimal = new Prisma.Decimal(val);
    if (decimal.lessThanOrEqualTo(0)) throw new Error("Amount must be positive");
    return decimal;
  }),
});

export type FeeItemInput = z.infer<typeof FeeItemSchema>;

export const UpdateFeeItemSchema = FeeItemSchema.partial();

export const TemplateItemInputSchema = z.object({
  feeItemId: z.string().min(1, "Fee item ID is required"),
  amountOverride: z.union([z.number(), z.string(), z.null(), z.undefined()]).transform((val) => {
    if (val === null || val === undefined || val === "") return null;
    return new Prisma.Decimal(val);
  }),
});

export type TemplateItemInput = z.infer<typeof TemplateItemInputSchema>;

export const ClassFeeTemplateSchema = z.object({
  classLevelId: z.string().min(1, "Class level is required"),
  termId: z.string().min(1, "Term is required"),
  status: z.enum(["draft", "published"]).default("draft"),
  items: z.array(TemplateItemInputSchema).min(1, "At least one fee item is required"),
});

export type ClassFeeTemplateInput = z.infer<typeof ClassFeeTemplateSchema>;

export const UpdateClassFeeTemplateSchema = z.object({
  id: z.string().min(1, "Template ID is required"),
  status: z.enum(["draft", "published"]).optional(),
  items: z.array(TemplateItemInputSchema).optional(),
});
