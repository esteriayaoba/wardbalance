import { z } from "zod";

export const CreateLeadSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(120, "Full name must be at most 120 characters")
    .transform((v) => v.trim()),
  schoolName: z
    .string()
    .min(1, "School name is required")
    .max(160, "School name must be at most 160 characters")
    .transform((v) => v.trim()),
  role: z
    .string()
    .max(80, "Role must be at most 80 characters")
    .transform((v) => v.trim())
    .default("other"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .transform((v) => v.toLowerCase().trim()),
  phone: z
    .string()
    .max(30, "Phone must be at most 30 characters")
    .transform((v) => v.trim())
    .optional()
    .or(z.literal("")),
  numberOfStudents: z.string().optional(),
  numberOfBranches: z.string().optional(),
  preferredContactMethod: z.enum(["email", "phone", "whatsapp"]).default("email"),
  message: z
    .string()
    .max(1000, "Message must be at most 1000 characters")
    .transform((v) => v.trim())
    .optional()
    .or(z.literal("")),
  source: z.string().default("marketing_page"),
  consentToContact: z.literal(true, { message: "You must agree to be contacted" }),
  consentTimestamp: z.string().optional(),
  consentVersion: z.string().optional(),

  // UTM attribution
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  referrer: z.string().optional(),
  landingPage: z.string().optional(),

  // Anti-spam honeypot — if filled, route.ts will silently reject with 200
  website: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

export const CreateLeadResponseSchema = z.object({
  data: z.object({
    leadId: z.string(),
  }),
  message: z.string(),
});

export const CreateLeadErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
});
