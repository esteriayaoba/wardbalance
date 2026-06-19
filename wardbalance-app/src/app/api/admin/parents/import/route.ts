import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

interface ParentImportRow {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { parents } = await request.json();

    if (!Array.isArray(parents)) {
      return NextResponse.json(
        { error: "Parents array is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const schoolId = session.schoolId;

    // Fetch existing phone numbers to prevent duplicate errors
    const existingParents = await prisma.parent.findMany({
      where: { schoolId },
      select: { phone: true },
    });

    const existingPhones = new Set(existingParents.map((p) => p.phone.toLowerCase().replace(/[^0-9]/g, "")));

    const importedParents: any[] = [];
    const skippedRecords: { row: number; reason: string }[] = [];

    // Temporary set to check duplicates within the CSV itself
    const csvPhones = new Set<string>();

    for (let i = 0; i < parents.length; i++) {
      const rowNum = i + 1;
      const row = parents[i] as ParentImportRow;

      const firstName = row.firstName?.trim();
      const lastName = row.lastName?.trim();
      const phone = row.phone?.trim();

      if (!firstName || !lastName || !phone) {
        skippedRecords.push({
          row: rowNum,
          reason: "Missing required fields (First Name, Last Name, or Phone).",
        });
        continue;
      }

      // Basic Nigerian mobile validation check
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.length < 10) {
        skippedRecords.push({
          row: rowNum,
          reason: `Invalid phone number "${phone}". Must be a valid contact number.`,
        });
        continue;
      }

      // Check CSV self-duplicates
      if (csvPhones.has(cleanPhone)) {
        skippedRecords.push({
          row: rowNum,
          reason: `Duplicate phone number "${phone}" found within the CSV file.`,
        });
        continue;
      }
      csvPhones.add(cleanPhone);

      // Check DB duplicates
      if (existingPhones.has(cleanPhone)) {
        skippedRecords.push({
          row: rowNum,
          reason: `Phone number "${phone}" is already registered in the database.`,
        });
        continue;
      }

      importedParents.push({
        schoolId,
        firstName,
        lastName,
        phone,
        email: row.email?.trim() || null,
        address: row.address?.trim() || null,
      });
    }

    // Execute transaction writes
    if (importedParents.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.parent.createMany({
          data: importedParents,
        });

        // Write AuditLog
        await tx.auditLog.create({
          data: {
            schoolId,
            actorId: session.userId,
            actorName: session.fullName,
            action: "PARENT_BULK_IMPORTED",
            entityType: "Parent",
            entityId: "bulk",
            newValue: {
              importedCount: importedParents.length,
              skippedCount: skippedRecords.length,
            },
          },
        });
      });
    }

    return NextResponse.json({
      data: {
        imported: importedParents.length,
        skipped: skippedRecords.length,
        skippedDetails: skippedRecords,
      },
      message: "CSV Parent import completed.",
    });
  } catch (err) {
    console.error("[parents] Import error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during CSV parsing", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
