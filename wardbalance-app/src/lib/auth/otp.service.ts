import crypto from "crypto";
import { upstashGet, upstashSet, upstashDel, upstashIncr } from "@/lib/redis";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_SECONDS = 900; // 15 minutes
const OTP_EXPIRY_SECONDS = 600; // 10 minutes

// Offline-tolerant In-Memory fallback cache
interface MemoryItem {
  value: string;
  expiresAt: number;
}
const localMemoryCache = new Map<string, MemoryItem>();

async function getTtl(key: string): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return -1;
  try {
    const res = await fetch(`${url}/ttl/${encodeURIComponent(key)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return -1;
    const data = await res.json();
    return typeof data.result === "number" ? data.result : -1;
  } catch (err) {
    // If offline, estimate TTL using local memory cache
    const memItem = localMemoryCache.get(key);
    if (memItem) {
      return Math.max(0, Math.ceil((memItem.expiresAt - Date.now()) / 1000));
    }
    return -1;
  }
}

async function safeGet(key: string): Promise<string | null> {
  try {
    const val = await upstashGet(key);
    if (val !== null) return val;
  } catch (err) {
    console.warn("[OtpService] Upstash GET failed, using memory fallback");
  }

  // Fallback to local memory cache
  const memItem = localMemoryCache.get(key);
  if (memItem && memItem.expiresAt > Date.now()) {
    return memItem.value;
  }
  return null;
}

async function safeSet(key: string, value: string, expirySeconds: number): Promise<boolean> {
  // Always update memory backup
  localMemoryCache.set(key, {
    value,
    expiresAt: Date.now() + expirySeconds * 1000,
  });

  try {
    return await upstashSet(key, value, expirySeconds);
  } catch (err) {
    console.warn("[OtpService] Upstash SET failed, stored in local memory only");
    return true; // Return true as we stored it successfully in memory
  }
}

async function safeDel(key: string): Promise<void> {
  localMemoryCache.delete(key);
  try {
    await upstashDel(key);
  } catch (err) {
    console.warn("[OtpService] Upstash DEL failed, cleared from memory only");
  }
}

async function safeIncr(key: string, expirySeconds: number): Promise<number> {
  const memItem = localMemoryCache.get(key);
  let newValue = 1;
  
  if (memItem && memItem.expiresAt > Date.now()) {
    newValue = parseInt(memItem.value, 10) + 1;
  }
  
  localMemoryCache.set(key, {
    value: newValue.toString(),
    expiresAt: Date.now() + expirySeconds * 1000,
  });

  try {
    const val = await upstashIncr(key, expirySeconds);
    if (val !== null) return val;
  } catch (err) {
    console.warn("[OtpService] Upstash INCR failed, using memory fallback: value =", newValue);
  }

  return newValue;
}

export class OtpService {
  /**
   * Check if the identifier is locked out from verification
   */
  static async checkLockout(
    schoolId: string,
    identifier: string
  ): Promise<{ locked: boolean; remainingSeconds: number }> {
    const key = `otp_failures:${schoolId}:${identifier.toLowerCase().trim()}`;
    const failuresStr = await safeGet(key);
    
    if (failuresStr !== null && parseInt(failuresStr, 10) >= LOCKOUT_THRESHOLD) {
      const ttl = await getTtl(key);
      return {
        locked: true,
        remainingSeconds: ttl > 0 ? ttl : LOCKOUT_WINDOW_SECONDS,
      };
    }

    return { locked: false, remainingSeconds: 0 };
  }

  /**
   * Log a failed verification attempt and increment the count
   */
  static async incrementFailures(schoolId: string, identifier: string): Promise<number | null> {
    const key = `otp_failures:${schoolId}:${identifier.toLowerCase().trim()}`;
    return safeIncr(key, LOCKOUT_WINDOW_SECONDS);
  }

  /**
   * Reset the failure count on successful login/verification
   */
  static async clearFailures(schoolId: string, identifier: string): Promise<void> {
    const key = `otp_failures:${schoolId}:${identifier.toLowerCase().trim()}`;
    await safeDel(key);
  }

  /**
   * Generate a secure 6-digit numeric OTP and store its sha256 hash in Redis/Memory
   */
  static async generateOtp(
    schoolId: string,
    identifier: string
  ): Promise<{ otp: string; expiresInSeconds: number }> {
    // Generate secure 6-digit PIN
    const otp = crypto.randomInt(100000, 1000000).toString();
    const hash = crypto.createHash("sha256").update(otp).digest("hex");
    const key = `otp:${schoolId}:${identifier.toLowerCase().trim()}`;

    await safeSet(key, hash, OTP_EXPIRY_SECONDS);

    return {
      otp,
      expiresInSeconds: OTP_EXPIRY_SECONDS,
    };
  }

  /**
   * Verify an incoming OTP, timing-safely, and immediately invalidate the code (one-time use)
   */
  static async verifyOtp(
    schoolId: string,
    identifier: string,
    otp: string
  ): Promise<{ success: boolean; error?: string; code?: "EXPIRED" | "LOCKED" | "INVALID" }> {
    const cleanIdentifier = identifier.toLowerCase().trim();

    // 1. Check lockout status first
    const lockout = await this.checkLockout(schoolId, cleanIdentifier);
    if (lockout.locked) {
      const minutes = Math.ceil(lockout.remainingSeconds / 60);
      return {
        success: false,
        code: "LOCKED",
        error: `Too many failed attempts. Try again in ${minutes} minutes.`,
      };
    }

    // 2. Fetch the stored hash
    const key = `otp:${schoolId}:${cleanIdentifier}`;
    const storedHash = await safeGet(key);

    if (!storedHash) {
      const failures = await this.incrementFailures(schoolId, cleanIdentifier);
      if (failures !== null && failures >= LOCKOUT_THRESHOLD) {
        return {
          success: false,
          code: "LOCKED",
          error: "Too many failed attempts. Locked out for 15 minutes.",
        };
      }
      return {
        success: false,
        code: "EXPIRED",
        error: "Verification code has expired or is invalid.",
      };
    }

    // 3. Immediately consume the OTP (one-time use requirement)
    await safeDel(key);

    // 4. Timing-safe verification comparison
    const incomingHash = crypto.createHash("sha256").update(otp).digest("hex");
    let matches = false;
    try {
      matches = crypto.timingSafeEqual(
        Buffer.from(storedHash, "utf8"),
        Buffer.from(incomingHash, "utf8")
      );
    } catch {
      matches = false;
    }

    if (!matches) {
      const failures = await this.incrementFailures(schoolId, cleanIdentifier);
      const remainingAttempts = Math.max(0, LOCKOUT_THRESHOLD - (failures ?? 0));
      
      if (remainingAttempts === 0) {
        return {
          success: false,
          code: "LOCKED",
          error: "Too many failed attempts. Locked out for 15 minutes.",
        };
      }

      return {
        success: false,
        code: "INVALID",
        error: `Incorrect verification code. ${remainingAttempts} attempts remaining.`,
      };
    }

    // 5. Successful validation - clear lockout counts
    await this.clearFailures(schoolId, cleanIdentifier);

    return { success: true };
  }
}
