import { prisma } from "@/lib/prisma";

/**
 * Resolves the parent ID associated with a student.
 * Looks for the primary contact first, then falls back to any linked parent.
 *
 * @param schoolId The school ID tenant scope.
 * @param studentId The student ID.
 * @returns The resolved parent ID or null if no parent is linked.
 */
export async function resolveParentId(schoolId: string, studentId: string): Promise<string | null> {
  const primary = await prisma.parentWardLink.findFirst({
    where: { studentId, schoolId, isPrimaryContact: true },
  });
  if (primary) return primary.parentId;

  const anyLink = await prisma.parentWardLink.findFirst({
    where: { studentId, schoolId },
  });
  return anyLink?.parentId || null;
}
