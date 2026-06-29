import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireVerifiedAdminUser } from "@/lib/auth/require-verified-admin";
import { logError } from "@/lib/logger";
import { previewInvoiceGeneration, generateInvoices } from "@/services/invoice-generator.service";

const GenerationPreviewSchema = z.object({
  classLevelId: z.string().min(1, "Class level is required"),
  termId: z.string().min(1, "Term is required"),
  templateId: z.string().optional(),
});

const GenerateInvoicesSchema = z.object({
  classLevelId: z.string().min(1, "Class level is required"),
  termId: z.string().min(1, "Term is required"),
  templateId: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  studentIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireVerifiedAdminUser();
    if (!session.authorized) return session.response;
    const schoolId = session.session.schoolId;

    const { searchParams } = new URL(request.url);
    const classLevelId = searchParams.get("classLevelId") ?? "";
    const termId = searchParams.get("termId") ?? "";
    const templateId = searchParams.get("templateId") || undefined;

    const parsed = GenerationPreviewSchema.safeParse({ classLevelId, termId, templateId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid params", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { previews, warning } = await previewInvoiceGeneration(schoolId, classLevelId, termId, templateId);

    return NextResponse.json({
      data: previews,
      ...(warning ? { warning } : {}),
    });
  } catch (err) {
    logError("invoices/generate GET", err);
    return NextResponse.json(
      { error: "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireVerifiedAdminUser();
    if (!session.authorized) return session.response;
    const { schoolId, userId, fullName } = session.session;

    const body = await request.json();
    const parsed = GenerateInvoicesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { classLevelId, termId, templateId, dueDate, studentIds } = parsed.data;

    const result = await generateInvoices({
      schoolId,
      actorId: userId,
      actorName: fullName,
      classLevelId,
      termId,
      templateId,
      dueDate: new Date(dueDate),
      studentIds,
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "No active students found in this class level to generate invoices for.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: result.invoices,
      count: result.count,
      message: result.message,
    });
  } catch (err) {
    logError("invoices/generate POST", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "An unexpected error occurred", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
