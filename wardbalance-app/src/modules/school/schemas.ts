import { z } from "zod";

export const SettingsSchema = z.object({
  name: z.string().min(1, "School name is required").max(160),
  address: z.string().min(1, "School address is required").max(500),
  phone: z.string().min(1, "School contact phone is required").max(30),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  estimatedStudents: z.string().optional().or(z.literal("")),
  bankName: z.string().max(100).optional().or(z.literal("")),
  bankAccountNumber: z.string().max(30).optional().or(z.literal("")),
  bankAccountName: z.string().max(150).optional().or(z.literal("")),
});

export type SettingsInput = z.infer<typeof SettingsSchema>;
