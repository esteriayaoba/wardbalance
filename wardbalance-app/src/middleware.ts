import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*", "/parent/:path*", "/api/admin/:path*", "/api/portal/:path*"],
};
