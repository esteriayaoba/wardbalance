import { requireRole, RequireRoleResult } from "@/lib/auth/require-role";

export type RequireVerifiedAdminResult = RequireRoleResult;

export async function requireVerifiedAdminUser(): Promise<RequireVerifiedAdminResult> {
  return requireRole(
    ["SchoolOwner", "Principal", "Bursar", "Admin"],
    { skipEmailVerification: false, skipSchoolStatus: false }
  );
}
