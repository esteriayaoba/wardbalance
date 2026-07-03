import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [], // Providers are populated in the main nextauth.ts configuration to avoid Edge runtime database/bcrypt imports
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.role = u.role as string;
        token.schoolId = u.schoolId as string;
        token.schoolName = u.schoolName as string;
        token.schoolStatus = u.schoolStatus as string | undefined;
        token.emailVerified = !!u.emailVerified;
        token.isDemo = !!u.isDemo;
      }
      return token;
    },
    session({ session, token }) {
      const user = session.user as unknown as Record<string, unknown>;
      user.id = token.sub!;
      user.role = token.role;
      user.schoolId = token.schoolId;
      user.schoolName = token.schoolName;
      user.schoolStatus = token.schoolStatus;
      user.emailVerified = token.emailVerified;
      user.isDemo = token.isDemo;
      return session;
    },
    authorized({ request, auth: session }) {
      const { pathname } = request.nextUrl;

      // Allow NextAuth API routes
      if (pathname.startsWith("/api/auth")) return true;

      // Allow public pages
      if (
        pathname === "/login" ||
        pathname === "/parent/login" ||
        pathname === "/signup" ||
        pathname === "/invite" ||
        pathname === "/forgot-password" ||
        pathname === "/reset-password" ||
        pathname === "/" ||
        pathname.startsWith("/api/signup") ||
        pathname.startsWith("/api/demo") ||
        pathname.startsWith("/api/webhooks") ||
        pathname.startsWith("/api/cron") ||
        pathname.startsWith("/_next")
      )
        return true;

      const user = session?.user as Record<string, unknown> | undefined;
      const role = user?.role as string | undefined;

      // Admin routes require admin role
      if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
        if (!role) return false;
        if (role === "Parent") return false;
        return true;
      }

      // Parent routes require parent role
      if (pathname.startsWith("/parent") || pathname.startsWith("/api/portal")) {
        if (!role) return false;
        if (role !== "Parent") return false;
        return true;
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
} satisfies NextAuthConfig;
