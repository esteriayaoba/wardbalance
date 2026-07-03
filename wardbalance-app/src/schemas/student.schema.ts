import { z } from "zod";

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
