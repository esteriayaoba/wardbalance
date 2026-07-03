import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { rateLimit } from "@/lib/redis";
import { logError } from "@/lib/logger";
import { previewInvoiceGeneration, generateInvoices } from "@/services/invoice-generator.service";

async function getClientIp(request: NextRequest): Promise<string> {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  return realIp ?? "unknown";
}

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
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;
    const schoolId = guard.session.schoolId;

    const { searchParams } = new URL(request.url);
    const classLevelId = searchParams.get("classLevelId") ?? "";
    const termId = searchParams.get("termId") ?? "";
    const templateId = searchParams.get("templateId") || undefined;

    if (!classLevelId || !termId) {
      return NextResponse.json(
        { error: "classLevelId and termId are required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const preview = await previewInvoiceGeneration(schoolId, classLevelId, termId, templateId);
    return NextResponse.json({ data: preview });
  } catch (err) {
    logError("invoice-preview", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to preview invoice generation", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireRole(["SchoolOwner", "Bursar"]);
    if (!guard.authorized) return guard.response;

    const ip = await getClientIp(request);
    const rl = await rateLimit(ip, { prefix: "rate_limit:invoice_gen", maxRequests: 20, windowSeconds: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please wait before generating more invoices.", code: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = GenerateInvoicesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { classLevelId, termId, templateId, dueDate, studentIds } = parsed.data;

    const result = await generateInvoices({
      schoolId: guard.session.schoolId,
      actorId: guard.session.userId,
      actorName: guard.session.fullName,
      classLevelId,
      termId,
      templateId,
      dueDate: new Date(dueDate),
      studentIds,
    });

    return NextResponse.json({ data: result, message: "Invoices generated successfully." });
  } catch (err) {
    logError("invoice-generate", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate invoices", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
