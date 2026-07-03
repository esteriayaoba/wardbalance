import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { LinkWardSchema } from "@/schemas/parent.schema";

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const body = await request.json();
    const parsed = LinkWardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { parentId, studentId, relationshipType, isPrimaryContact, receivesInvoiceNotifications } = parsed.data;

    const parent = await prisma.parent.findFirst({
      where: { id: parentId, schoolId: guard.session.schoolId },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: guard.session.schoolId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const [link] = await prisma.$transaction(async (tx) => {
      // If setting as primary, unset any existing primary for this student
      if (isPrimaryContact) {
        await tx.parentWardLink.updateMany({
          where: { studentId, isPrimaryContact: true },
          data: { isPrimaryContact: false },
        });
      }

      // Use upsert to prevent duplicates
      const link = await tx.parentWardLink.upsert({
        where: {
          parentId_studentId: { parentId, studentId },
        },
        update: {
          relationshipType,
          isPrimaryContact: isPrimaryContact,
          receivesInvoiceNotifications,
        },
        create: {
          schoolId: guard.session.schoolId,
          parentId,
          studentId,
          relationshipType,
          isPrimaryContact,
          receivesInvoiceNotifications,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName ?? "Admin",
          action: "PARENT_WARD_LINKED",
          entityType: "ParentWardLink",
          entityId: link.id,
          newValue: JSON.parse(JSON.stringify(link)),
        },
      });

      return [link];
    });

    return NextResponse.json({ data: link, message: "Parent linked to ward successfully." }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to link parent to ward", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Admin"]);
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");
    if (!linkId) {
      return NextResponse.json({ error: "Link ID is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const existing = await prisma.parentWardLink.findFirst({
      where: { id: linkId, schoolId: guard.session.schoolId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Link not found", code: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.parentWardLink.delete({ where: { id: linkId } });

      // Defensive: if the deleted link was primary, ensure another link exists as primary
      if (existing.isPrimaryContact) {
        const remaining = await tx.parentWardLink.findFirst({
          where: { studentId: existing.studentId },
          orderBy: { createdAt: "asc" },
        });
        if (remaining) {
          await tx.parentWardLink.update({
            where: { id: remaining.id },
            data: { isPrimaryContact: true },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          schoolId: guard.session.schoolId,
          actorId: guard.session.userId,
          actorName: guard.session.fullName ?? "Admin",
          action: "PARENT_WARD_UNLINKED",
          entityType: "ParentWardLink",
          entityId: linkId,
          previousValue: JSON.parse(JSON.stringify(existing)),
        },
      });
    });

    return NextResponse.json({ message: "Parent unlinked from ward." });
  } catch (err) {
    return NextResponse.json({ error: "Failed to unlink parent", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
