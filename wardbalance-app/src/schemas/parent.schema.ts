import { z } from "zod";

export const CreateParentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

export type CreateParentInput = z.infer<typeof CreateParentSchema>;

export const ParentImportRowSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
});

export type ParentImportRow = z.infer<typeof ParentImportRowSchema>;

export const ParentImportSchema = z.array(ParentImportRowSchema).min(1, "At least one parent is required");

export type ParentImportInput = z.infer<typeof ParentImportSchema>;

export const UpdateParentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

export type UpdateParentInput = z.infer<typeof UpdateParentSchema>;

export const LinkWardSchema = z.object({
  parentId: z.string().min(1, "Parent ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
  relationshipType: z.enum(["Mother", "Father", "Guardian", "Sponsor", "Other"]),
  isPrimaryContact: z.boolean().default(false),
  receivesInvoiceNotifications: z.boolean().default(true),
});

export type LinkWardInput = z.infer<typeof LinkWardSchema>;
