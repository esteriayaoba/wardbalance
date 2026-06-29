import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) {
  throw new Error(
    "JWT_SECRET is not set. Add it to your .env file or hosting environment. " +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"" +
    "\n  → It is already in your local .env. If you see this in production, set the JWT_SECRET environment variable on your hosting platform (Vercel, Railway, etc.)."
  );
}
const JWT_SECRET = new TextEncoder().encode(rawSecret);

export async function encryptPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface UserSessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  schoolId: string;
  schoolName: string;
  isDemo?: boolean;
}

export async function signJWT(payload: UserSessionPayload, expiresIn: string = "24h"): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserSessionPayload;
  } catch {
    return null;
  }
}
