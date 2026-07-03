import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { comparePassword } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { upstashGet, upstashDel } from "@/lib/redis";
import { authConfig } from "@/lib/auth/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
});
