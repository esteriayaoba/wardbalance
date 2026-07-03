import { getSession, UserSessionPayload } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type RequireVerifiedAdminResult =
  | { authorized: false; response: NextResponse; session?: undefined; user?: undefined }
  | {
      authorized: true;
      session: UserSessionPayload;
      user: {
        id: string;
        role: string;
        emailVerified: boolean;
      };
      response?: undefined;
    };

export async function requireVerifiedAdminUser(): Promise<RequireVerifiedAdminResult> {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  // Allow bypass for demo sessions
  if (session.isDemo) {
    return {
      authorized: true,
      session,
      user: {
        id: session.userId,
        role: session.role,
        emailVerified: true,
      },
    };
  }

  // Query user verification details directly from the database
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, emailVerified: true },
  });

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "User not found", code: "NOT_FOUND" },
        { status: 404 }
      ),
    };
  }

  // Roles permitted for admin platform
  const allowedRoles = ["SchoolOwner", "Principal", "Bursar", "Admin"];
  if (!allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden: Administrative access required.", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  if (!user.emailVerified) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          code: "EMAIL_UNVERIFIED",
          error: "Please verify your email before performing this financial action.",
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, session, user };
}
