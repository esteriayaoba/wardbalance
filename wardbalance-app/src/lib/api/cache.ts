import { NextResponse } from "next/server";

export function withCache(response: NextResponse, maxAge = 30): NextResponse {
  response.headers.set(
    "Cache-Control",
    `private, max-age=${maxAge}, stale-while-revalidate=${maxAge * 4}`
  );
  return response;
}
