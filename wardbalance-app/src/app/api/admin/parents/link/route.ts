import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const LinkWardSchema = z.object({
  parentId: z.string().min(1, "Parent ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
  relationshipType: z.enum(["Mother", "Father", "Guardian", "Sponsor", "Other"]).default("Guardian"),
  isPrimaryContact: z.boolean().default(false),
  receivesInvoiceNotifications: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = LinkWardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify both belong to the school
    const [parent, student] = await Promise.all([
      prisma.parent.findFirst({ where: { id: data.parentId, schoolId: session.schoolId } }),
      prisma.student.findFirst({ where: { id: data.studentId, schoolId: session.schoolId } }),
    ]);

    if (!parent || !student) {
      return NextResponse.json(
        { error: "Parent or student record not found in your school.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const newLink = await prisma.$transaction(async (tx) => {
      // If setting this link as primary contact, reset others first
      if (data.isPrimaryContact) {
        await tx.parentWardLink.updateMany({
          where: { schoolId: session.schoolId, studentId: data.studentId, isPrimaryContact: true },
          data: { isPrimaryContact: false },
        });
      } else {
        // If there are no other links for this student, force this first link to be primary contact
        const currentLinkCount = await tx.parentWardLink.count({
          where: { schoolId: session.schoolId, studentId: data.studentId },
        });
        if (currentLinkCount === 0) {
          data.isPrimaryContact = true;
        }
      }

      // Upsert the link
      const link = await tx.parentWardLink.upsert({
        where: {
          parentId_studentId: {
            parentId: data.parentId,
            studentId: data.studentId,
          },
        },
        create: {
          schoolId: session.schoolId,
          parentId: data.parentId,
          studentId: data.studentId,
          relationshipType: data.relationshipType,
          isPrimaryContact: data.isPrimaryContact,
          receivesInvoiceNotifications: data.receivesInvoiceNotifications,
        },
        update: {
          relationshipType: data.relationshipType,
          isPrimaryContact: data.isPrimaryContact,
          receivesInvoiceNotifications: data.receivesInvoiceNotifications,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: "PARENT_WARD_LINK_CREATED",
          entityType: "ParentWardLink",
          entityId: link.id,
          newValue: JSON.parse(JSON.stringify(link)),
        },
      });

      return link;
    });

    return NextResponse.json({
      data: newLink,
      message: "Parent successfully linked to student.",
    });
  } catch (err) {
    console.error("[parents] Linking error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("id");

    if (!linkId) {
      return NextResponse.json(
        { error: "Link ID is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.parentWardLink.findFirst({
        where: { id: linkId, schoolId: session.schoolId },
      });

      if (!existing) {
        throw new Error("Link not found or unauthorized");
      }

      await tx.parentWardLink.delete({ where: { id: linkId } });

      // Audit Log
      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.userId,
          actorName: session.fullName,
          action: "PARENT_WARD_LINK_DELETED",
          entityType: "ParentWardLink",
          entityId: linkId,
          previousValue: JSON.parse(JSON.stringify(existing)),
        },
      });

      // Defensively check if student now has no primary contact, and set one if links exist
      const remainingLinks = await tx.parentWardLink.findMany({
        where: { studentId: existing.studentId },
      });

      if (remainingLinks.length > 0 && !remainingLinks.some((l) => l.isPrimaryContact)) {
        await tx.parentWardLink.update({
          where: { id: remainingLinks[0]!.id },
          data: { isPrimaryContact: true },
        });
      }

      return existing;
    });

    return NextResponse.json({
      data: result,
      message: "Parent link removed successfully.",
    });
  } catch (err: any) {
    console.error("[parents] Unlink error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to break parent link", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
