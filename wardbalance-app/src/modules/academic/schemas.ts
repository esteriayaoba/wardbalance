import { z } from "zod";

export const SessionSchema = z.object({
  name: z.string().min(1, "Session name is required").max(50),
  isActive: z.boolean().default(false),
});

export type SessionInput = z.infer<typeof SessionSchema>;

export const CreateTermSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  name: z.string().min(1, "Term name is required").max(50),
  isActive: z.boolean().default(false),
  status: z.enum(["active", "locked"]).default("active"),
});

export const UpdateTermSchema = z.object({
  id: z.string().min(1, "Term ID is required"),
  isActive: z.boolean().optional(),
  status: z.enum(["active", "locked"]).optional(),
});

export type CreateTermInput = z.infer<typeof CreateTermSchema>;
export type UpdateTermInput = z.infer<typeof UpdateTermSchema>;

export const CreateClassSchema = z.object({
  type: z.enum(["division", "level", "arm"]),
  name: z.string().min(1, "Name is required").max(100),
  divisionId: z.string().optional(),
  classLevelId: z.string().optional(),
});

export const DeleteClassSchema = z.object({
  type: z.enum(["division", "level", "arm"]),
  id: z.string().min(1, "ID is required"),
});

export type CreateClassInput = z.infer<typeof CreateClassSchema>;
export type DeleteClassInput = z.infer<typeof DeleteClassSchema>;

export const CreateStudentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  admissionNumber: z.string().min(1, "Admission number is required"),
  classLevelId: z.string().min(1, "Class level is required"),
  classArmId: z.string().min(1, "Class arm is required"),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  status: z.enum(["active", "inactive", "graduated", "transferred", "suspended", "withdrawn", "archived"]).default("active"),
});

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;

export const StudentImportRowSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  admissionNumber: z.string().min(1, "Admission number is required"),
  classLevelName: z.string().min(1, "Class level is required"),
  classArmName: z.string().min(1, "Class arm is required"),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

export type StudentImportRow = z.infer<typeof StudentImportRowSchema>;

export const StudentImportSchema = z.array(StudentImportRowSchema).min(1, "At least one student is required");

export type StudentImportInput = z.infer<typeof StudentImportSchema>;
