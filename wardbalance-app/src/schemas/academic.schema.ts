import { z } from "zod";

// Academic Session Schemas
export const SessionSchema = z.object({
  name: z.string().min(1, "Session name is required").max(50),
  isActive: z.boolean().default(false),
});

export type SessionInput = z.infer<typeof SessionSchema>;

// Academic Term Schemas
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

// Academic Classes Schemas
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
