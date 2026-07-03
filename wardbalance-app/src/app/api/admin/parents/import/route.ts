import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { ParentImportSchema } from "@/schemas/parent.schema";

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = ParentImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const parents = parsed.data;
    const errors: { row: number; reason: string }[] = [];
    const validParents: typeof parents = [];

    const seenPhones = new Set<string>();

    for (let i = 0; i < parents.length; i++) {
      const p = parents[i];
      const rowNum = i + 1;

      const cleanPhone = p.phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        errors.push({ row: rowNum, reason: `Phone number "${p.phone}" is invalid (min 10 digits).` });
        continue;
      }

      if (seenPhones.has(cleanPhone)) {
        errors.push({ row: rowNum, reason: `Duplicate phone number "${p.phone}" in import data.` });
        continue;
      }
      seenPhones.add(cleanPhone);

      const dbDup = await prisma.parent.findFirst({
        where: { schoolId: guard.session.schoolId, phone: { contains: cleanPhone } },
      });
      if (dbDup) {
        errors.push({ row: rowNum, reason: `Phone number "${p.phone}" already exists.` });
        continue;
      }

      validParents.push(p);
    }

    let imported = 0;
    if (validParents.length > 0) {
      const [result] = await prisma.$transaction(async (tx) => {
        const created = await tx.parent.createMany({
          data: validParents.map((p) => ({
            schoolId: guard.session.schoolId,
            firstName: p.firstName,
            lastName: p.lastName,
            phone: p.phone,
            email: p.email || null,
            address: p.address || null,
          })),
        });

        await tx.auditLog.create({
          data: {
            schoolId: guard.session.schoolId,
            actorId: guard.session.userId,
            actorName: guard.session.fullName ?? "Admin",
            action: "PARENT_BULK_IMPORTED",
            entityType: "Parent",
            entityId: "bulk",
            newValue: { imported: created.count, total: parents.length },
          },
        });

        return [created];
      });
      imported = result.count;
    }

    return NextResponse.json({
      data: { imported, skipped: errors.length, total: parents.length },
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length > 0
        ? `${imported} parents imported. ${errors.length} records skipped.`
        : `${imported} parents imported successfully.`,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to import parents", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
