import { NextRequest, NextResponse } from "next/server";

export async function PUT(_request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production", code: "NOT_AVAILABLE" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Mock upload to R2 succeeded." });
}
