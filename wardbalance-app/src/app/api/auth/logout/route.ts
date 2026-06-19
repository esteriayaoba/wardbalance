import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    message: "Successfully logged out.",
  });
  response.cookies.delete("session");
  return response;
}
