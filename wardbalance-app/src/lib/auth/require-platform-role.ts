import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PlatformRole } from "@/generated/prisma";
import { NextResponse } from "next/server";

export type RequirePlatformRoleResult =
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
      };
      user: {
        id: string;
        isPlatformAdmin: boolean;
        platformRole: PlatformRole | null;
        emailVerified: boolean;
      };
    };

export async function requirePlatformRole(
  allowedRoles: PlatformRole[]
): Promise<RequirePlatformRoleResult> {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized: Session not found", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  // Fetch fresh user record to verify platform flags
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      isPlatformAdmin: true,
      platformRole: true,
      emailVerified: true,
    },
  });

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized: User not found", code: "USER_NOT_FOUND" },
        { status: 401 }
      ),
    };
  }

  if (!user.isPlatformAdmin || !user.platformRole) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden: Platform access required", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  if (!allowedRoles.includes(user.platformRole)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden: Insufficient platform permissions", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    session: session as any,
    user,
  };
}
