import type { NextAuthConfig } from "next-auth";

// AUTH_SECRET is the canonical secret. Warn at startup if legacy fallback
// variables are still set so operators know which one is active.
const resolveSecret = (): string | undefined => {
  const primary = process.env.AUTH_SECRET;
  const fallback1 = process.env.NEXTAUTH_SECRET;
  const fallback2 = process.env.JWT_SECRET;

  if (!primary && (fallback1 || fallback2)) {
    console.warn(
      "[WardBalance] AUTH_SECRET is not set. Falling back to legacy env vars. " +
      "Set AUTH_SECRET explicitly in your environment to remove this ambiguity. " +
      "Active fallback: " + (fallback1 ? "NEXTAUTH_SECRET" : "JWT_SECRET")
    );
  }

  return primary || fallback1 || fallback2;
};

export const authConfig = {
  providers: [], // Providers are populated in the main nextauth.ts configuration to avoid Edge runtime database/bcrypt imports
  secret: resolveSecret(),
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
      const schoolStatus = user?.schoolStatus as string | undefined;

      // Admin routes require admin role
      if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
        if (!role) return false;
        if (role === "Parent") return false;
        if (!["SchoolOwner", "Principal", "Bursar", "Admin"].includes(role)) return false;
        if (schoolStatus === "paused" || schoolStatus === "archived") return false;
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
    updateAge: 24 * 60 * 60,
  },
} satisfies NextAuthConfig;
