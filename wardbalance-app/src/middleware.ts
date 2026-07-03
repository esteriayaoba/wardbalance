export { auth as middleware } from "@/lib/nextauth";

export const config = {
  matcher: ["/admin/:path*", "/parent/:path*", "/api/admin/:path*", "/api/portal/:path*"],
};
