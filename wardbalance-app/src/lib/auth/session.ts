import { cookies } from "next/headers";
import { verifyJWT, UserSessionPayload } from "./auth";

export async function getSession(): Promise<UserSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;
    return await verifyJWT(token);
  } catch (err) {
    console.error("[session] Failed to get session:", err);
    return null;
  }
}
