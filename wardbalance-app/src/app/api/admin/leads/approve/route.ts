import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json();

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Process conversion in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        throw new Error("Lead not found");
      }

      if (lead.status === "converted") {
        throw new Error("Lead already converted to a school");
      }

      // 1. Create the School Tenant
      const school = await tx.school.create({
        data: {
          name: lead.schoolName,
          email: lead.email,
          phone: lead.phone,
          estimatedStudents: lead.numberOfStudents,
          status: "approved", // approved status
        },
      });

      // 2. Update Lead status
      await tx.lead.update({
        where: { id: leadId },
        data: { status: "converted" },
      });

      // 3. Generate secure invitation token for the first Admin/Owner user
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      const invitation = await tx.invitation.create({
        data: {
          schoolId: school.id,
          email: lead.email,
          role: "SchoolOwner", // first user defaults to SchoolOwner
          token,
          expiresAt,
        },
      });

      // 4. Create initial AuditLog entry
      await tx.auditLog.create({
        data: {
          schoolId: school.id,
          actorId: "system",
          actorName: "System Automation",
          action: "SCHOOL_CREATED",
          entityType: "School",
          entityId: school.id,
          newValue: {
            schoolName: school.name,
            leadId: lead.id,
            ownerEmail: lead.email,
          },
        },
      });

      return {
        school,
        invitation,
      };
    });

    const inviteLink = `/invite?token=${result.invitation.token}`;

    return NextResponse.json({
      data: {
        schoolId: result.school.id,
        inviteToken: result.invitation.token,
        inviteLink,
      },
      message: "Lead successfully approved and school tenant created.",
    });
  } catch (err: any) {
    console.error("[leads] Approval error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to approve lead", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
