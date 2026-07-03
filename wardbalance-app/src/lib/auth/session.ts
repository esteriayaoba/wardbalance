import { auth } from "@/lib/nextauth";

export interface UserSessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  schoolId: string;
  schoolName: string;
  schoolStatus?: string;
  emailVerified?: boolean;
  isDemo?: boolean;
}

export async function getSession(): Promise<UserSessionPayload | null> {
  try {
    const session = await auth();
    if (!session?.user) return null;

    const u = session.user as unknown as Record<string, unknown>;
    return {
      userId: u.id as string,
      email: (u.email as string) ?? "",
      fullName: (u.name as string) ?? "",
      role: (u.role as string) ?? "",
      schoolId: (u.schoolId as string) ?? "",
      schoolName: (u.schoolName as string) ?? "",
      schoolStatus: u.schoolStatus as string | undefined,
      emailVerified: u.emailVerified as boolean | undefined,
      isDemo: u.isDemo as boolean | undefined,
    };
  } catch (err) {
    console.error("[session] Failed to get session:", err);
    return null;
  }
}
