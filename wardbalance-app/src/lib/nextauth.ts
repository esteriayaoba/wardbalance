import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { comparePassword } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { upstashGet, upstashDel } from "@/lib/redis";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials as {
          email: string;
          password: string;
        };
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: { school: { select: { name: true, status: true } } },
        });
        if (!user) return null;

        const valid = await comparePassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          schoolId: user.schoolId,
          schoolName: user.school.name,
          schoolStatus: user.school.status,
          emailVerified: user.emailVerified,
        };
      },
    }),
    Credentials({
      id: "parent-otp",
      name: "Parent OTP",
      credentials: {
        phoneOrEmail: { label: "Phone or Email" },
        otp: { label: "OTP" },
      },
      async authorize(credentials) {
        const { phoneOrEmail, otp } = credentials as {
          phoneOrEmail: string;
          otp: string;
        };
        if (!phoneOrEmail || !otp) return null;

        const key = `otp:${phoneOrEmail.toLowerCase().trim()}`;
        const stored = await upstashGet(key);
        if (!stored || stored !== otp) return null;

        await upstashDel(key);

        const parent = await prisma.parent.findFirst({
          where: {
            OR: [
              { email: phoneOrEmail.toLowerCase().trim() },
              { phone: phoneOrEmail.trim() },
            ],
          },
          include: { school: { select: { name: true } } },
        });
        if (!parent) return null;

        return {
          id: parent.id,
          email: parent.email || `${parent.phone}@wardbalance.local`,
          name: `${parent.firstName} ${parent.lastName}`,
          role: "Parent",
          schoolId: parent.schoolId,
          schoolName: parent.school.name,
        };
      },
    }),
  ],
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
});
