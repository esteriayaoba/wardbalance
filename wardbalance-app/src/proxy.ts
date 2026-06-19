import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "wardbalance-default-secret-key-please-change-in-production"
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin routes
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get("session")?.value;

    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Verify JWT
      const { payload } = await jwtVerify(sessionCookie, JWT_SECRET);
      
      // Make sure it's an admin role, not a Parent
      if (payload.role === "Parent") {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
      }
      
      return NextResponse.next();
    } catch (err) {
      // Invalid session, redirect to login and clear cookie
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session");
      return response;
    }
  }

  // Protect all /parent routes (except login)
  if (pathname.startsWith("/parent") && pathname !== "/parent/login") {
    const sessionCookie = request.cookies.get("session")?.value;

    if (!sessionCookie) {
      const loginUrl = new URL("/parent/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Verify JWT
      const { payload } = await jwtVerify(sessionCookie, JWT_SECRET);
      
      // Ensure only Parent role is allowed
      if (payload.role !== "Parent") {
        const loginUrl = new URL("/parent/login", request.url);
        return NextResponse.redirect(loginUrl);
      }
      
      return NextResponse.next();
    } catch (err) {
      const response = NextResponse.redirect(new URL("/parent/login", request.url));
      response.cookies.delete("session");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/parent/:path*"],
};
