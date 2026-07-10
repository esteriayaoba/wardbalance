import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isApiRoute = req.nextUrl.pathname.startsWith("/api/");
  const isAuthorized = !!req.auth;

  if (isApiRoute && !isAuthorized) {
    const { pathname } = req.nextUrl;
    // Allow public API routes to pass through to their handlers
    if (
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/signup") ||
      pathname.startsWith("/api/demo") ||
      pathname.startsWith("/api/webhooks") ||
      pathname.startsWith("/api/cron") // lifecycle + overdue
    ) {
      return;
    }

    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
});

export const config = {
  matcher: ["/admin/:path*", "/parent/:path*", "/api/admin/:path*", "/api/portal/:path*"],
};

