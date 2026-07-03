import { NextResponse } from "next/server";
import { signOut } from "@/lib/nextauth";

// DEPRECATED: Logout is now handled by NextAuth's signOut.
// This route is kept for backward compatibility only.
export async function POST() {
  try {
    await signOut({ redirect: false });
    return NextResponse.json({ message: "Successfully logged out." });
  } catch {
    return NextResponse.json({ message: "Logged out." });
  }
}
