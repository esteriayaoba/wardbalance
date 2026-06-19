import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ProofUploadSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  reference: z.string().min(1, "Transaction reference is required"),
  proofImageKey: z.string().optional(), // In Phase 2B, this will hold the R2 object key
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "Parent") {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const parentId = session.userId;
    const schoolId = session.schoolId;

    // Get parent's wards
    const wardLinks = await prisma.parentWardLink.findMany({
      where: { parentId, schoolId },
      select: { studentId: true },
    });

    const wardIds = wardLinks.map((link) => link.studentId);

    // Get payment records
    const payments = await prisma.payment.findMany({
      where: {
        schoolId,
        studentId: { in: wardIds },
      },
      include: {
        student: {
          select: { firstName: true, lastName: true },
        },
        invoice: {
          select: {
            term: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: payments.map((p) => ({
        id: p.id,
        amount: p.amount.toString(),
        method: p.method,
        status: p.status,
        reference: p.reference,
        createdAt: p.createdAt.toISOString(),
        studentName: `${p.student.firstName} ${p.student.lastName}`,
        termName: p.invoice.term.name,
      })),
    });
  } catch (err: any) {
    console.error("[portal/payments] GET error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "Parent") {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const parentId = session.userId;
    const schoolId = session.schoolId;

    const body = await request.json();
    const parsed = ProofUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid proof payload", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { invoiceId, amount, reference, proofImageKey } = parsed.data;

    // Verify invoice belongs to a ward of the parent
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        schoolId,
        student: {
          parents: {
            some: { parentId },
          },
        },
      },
      select: {
        id: true,
        studentId: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found or unauthorized.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // TODO: Phase 2B - Write proof details into a VerificationQueue or PendingPayment table.
    // Since Phase 2A uses manual recording only, we simulate successful upload and log details.
    console.log(`[Proof Upload] Parent ${parentId} uploaded proof for Invoice ${invoiceId}:
      Amount: ₦${amount}
      Reference: ${reference}
      Image Key: ${proofImageKey ?? "None"}
      Status: Pending Verification`);

    return NextResponse.json({
      data: {
        success: true,
        status: "Pending Verification",
        reference,
        amount: amount.toString(),
        message: "Proof of payment submitted successfully and is awaiting bursar verification.",
      },
    });
  } catch (err: any) {
    console.error("[portal/payments] POST error:", err);
    return NextResponse.json(
      { error: err.message ?? "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
