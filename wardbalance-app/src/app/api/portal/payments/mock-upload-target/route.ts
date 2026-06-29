import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  // Simulate file upload target by immediately returning 200 OK
  return NextResponse.json({ success: true, message: "Mock upload to R2 succeeded." });
}
