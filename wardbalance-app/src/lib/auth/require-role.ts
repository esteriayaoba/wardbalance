import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type RequireRoleResult =
  | { authorized: false; response: NextResponse }
  | {
      authorized: true;
      session: {
        userId: string;
        email: string;
        fullName: string;
        role: string;
        schoolId: string;
        schoolName: string;
        schoolStatus?: string;
        emailVerified?: boolean;
        isDemo?: boolean;
      };
      user: { id: string; role: string; emailVerified: boolean };
    };

const BLOCKED_SCHOOL_STATUSES = ["paused", "archived"];

export async function requireRole(
  allowedRoles: string[],
  options?: {
    allowOnboarding?: boolean;
    skipEmailVerification?: boolean;
    skipSchoolStatus?: boolean;
  }
): Promise<RequireRoleResult> {
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

  // Demo sessions bypass all checks
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

  const schoolStatus = session.schoolStatus;

  // Block paused/archived schools unless skipped
  if (!options?.skipSchoolStatus && schoolStatus) {
    if (BLOCKED_SCHOOL_STATUSES.includes(schoolStatus)) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "School account is not active. Contact support.", code: "SCHOOL_NOT_ACTIVE" },
          { status: 403 }
        ),
      };
    }
  }

  // Query user for fresh role + email verification
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, emailVerified: true },
  });

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 401 }
      ),
    };
  }

  // Check role is in allowed set
  if (!allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden: Insufficient permissions.", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  // Check email verification unless skipped
  if (!options?.skipEmailVerification && !user.emailVerified) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          code: "EMAIL_UNVERIFIED",
          error: "Please verify your email before performing this action.",
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, session, user };
}
