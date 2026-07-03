import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { comparePassword } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { upstashGet, upstashDel, upstashIncr, rateLimit } from "@/lib/redis";
import { authConfig } from "@/lib/auth/auth.config";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_SECONDS = 900; // 15 min

async function isAccountLocked(email: string): Promise<boolean> {
  const key = `lockout:${email.toLowerCase().trim()}`;
  const attempts = await upstashGet(key);
  return attempts !== null && parseInt(attempts, 10) >= LOCKOUT_THRESHOLD;
}

async function recordFailedAttempt(email: string): Promise<void> {
  const key = `lockout:${email.toLowerCase().trim()}`;
  await upstashIncr(key, LOCKOUT_WINDOW_SECONDS);
}

async function clearLockout(email: string): Promise<void> {
  await upstashDel(`lockout:${email.toLowerCase().trim()}`);
}

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
      async authorize(credentials, request) {
        const { email, password } = credentials as {
          email: string;
          password: string;
        };
        if (!email || !password) return null;

        // Rate limit by IP
        const ip =
          (request?.headers?.get("x-forwarded-for") ?? request?.headers?.get("x-real-ip") ?? "unknown")
            .split(",")[0]
            .trim();
        const rl = await rateLimit(ip, {
          prefix: "rate_limit:login",
          maxRequests: 10,
          windowSeconds: 300,
        });
        if (!rl.allowed) return null;

        // Check account lockout
        if (await isAccountLocked(email)) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: { school: { select: { name: true, status: true } } },
        });
        if (!user) {
          await recordFailedAttempt(email);
          return null;
        }

        const valid = await comparePassword(password, user.passwordHash);
        if (!valid) {
          await recordFailedAttempt(email);
          return null;
        }

        await clearLockout(email);

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
