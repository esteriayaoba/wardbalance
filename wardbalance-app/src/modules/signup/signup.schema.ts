import { z } from "zod";

export const SchoolSignupSchema = z.object({
  plan: z.enum(["freemium", "business"]),
  schoolName: z
    .string()
    .min(1, "School name is required")
    .max(160, "School name must be at most 160 characters")
    .transform((v) => v.trim()),
  schoolType: z.enum([
    "Nursery",
    "Primary",
    "Secondary",
    "Nursery & Primary",
    "Primary & Secondary",
    "Nursery, Primary & Secondary",
    "Other",
  ]),
  country: z
    .string()
    .min(1, "Country is required")
    .max(80)
    .default("Nigeria")
    .transform((v) => v.trim()),
  state: z
    .string()
    .max(80)
    .transform((v) => v.trim())
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .max(80)
    .transform((v) => v.trim())
    .optional()
    .or(z.literal("")),
  estimatedStudents: z.coerce
    .number()
    .int("Estimated students must be a whole number")
    .positive("Estimated students must be greater than zero"),
  ownerFullName: z
    .string()
    .min(1, "Owner full name is required")
    .max(120, "Name must be at most 120 characters")
    .transform((v) => v.trim()),
  ownerEmail: z
    .string()
    .min(1, "Owner email is required")
    .email("Please enter a valid email address")
    .transform((v) => v.toLowerCase().trim()),
  ownerPhone: z
    .string()
    .min(1, "Owner phone number is required")
    .max(30, "Phone number must be at most 30 characters")
    .transform((v) => v.trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters")
    .refine((val) => /[^a-zA-Z0-9\s]/.test(val), {
      message: "Password must contain at least one special character",
    })
    .refine((val) => /[A-Z]/.test(val), {
      message: "Password must contain at least one uppercase letter",
    })
    .refine((val) => /[a-z]/.test(val), {
      message: "Password must contain at least one lowercase letter",
    }),
  agreedToTerms: z.literal(true, {
    message: "You must agree to the Terms and Privacy Policy",
  }),
  source: z.string().optional(),
});

export type SchoolSignupInput = z.infer<typeof SchoolSignupSchema>;
