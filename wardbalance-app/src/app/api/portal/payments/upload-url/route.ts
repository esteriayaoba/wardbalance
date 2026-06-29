import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getPresignedPutUrl } from "@/lib/r2";
import { z } from "zod";

const UploadUrlRequestSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().refine(
    (type) => ["image/jpeg", "image/png", "application/pdf"].includes(type),
    "Only JPEG, PNG, and PDF files are allowed."
  ),
  fileSize: z.number().max(10 * 1024 * 1024, "File size must not exceed 10MB"),
});

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
    const parsed = UploadUrlRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { fileName, fileType, fileSize } = parsed.data;

    // Sanitize filename to prevent directory traversal
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueKey = `schools/${schoolId}/parents/${parentId}/proofs/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${cleanFileName}`;

    const { uploadUrl, key, isMock } = await getPresignedPutUrl(uniqueKey, fileType, fileSize);

    return NextResponse.json({
      data: {
        uploadUrl,
        key,
        isMock,
      },
    });
  } catch (err: any) {
    console.error("[portal/payments/upload-url] POST error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to generate upload target", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
