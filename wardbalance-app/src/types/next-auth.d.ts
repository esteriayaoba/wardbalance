import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: string;
    schoolId: string;
    schoolName: string;
    schoolStatus?: string;
    isDemo?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    schoolId: string;
    schoolName: string;
    schoolStatus?: string;
    emailVerified: boolean;
    isDemo?: boolean;
  }
}
