import { prisma } from "@/lib/prisma";

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
