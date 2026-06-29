import crypto from "crypto";

/**
 * Simple Redis client using Upstash REST API.
 * Avoids extra node_modules and works in serverless environments.
 */

const getRedisConfig = () => ({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function upstashIncr(key: string, expirySeconds: number = 60): Promise<number | null> {
  const { url, token } = getRedisConfig();
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/incr/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const count = data.result;
    if (count === 1) {
      await fetch(`${url}/expire/${key}/${expirySeconds}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(2000),
      });
    }
    return typeof count === "number" ? count : null;
  } catch (err) {
    console.error("[redis] upstashIncr failed:", err);
    return null;
  }
}

export async function upstashSet(key: string, value: string, expirySeconds: number): Promise<boolean> {
  const { url, token } = getRedisConfig();
  if (!url || !token) return false;

  try {
    const res = await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/ex/${expirySeconds}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch (err) {
    console.error("[redis] upstashSet failed:", err);
    return false;
  }
}

export async function upstashGet(key: string): Promise<string | null> {
  const { url, token } = getRedisConfig();
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result ?? null;
  } catch (err) {
    console.error("[redis] upstashGet failed:", err);
    return null;
  }
}

export async function upstashDel(key: string): Promise<void> {
  const { url, token } = getRedisConfig();
  if (!url || !token) return;

  try {
    await fetch(`${url}/del/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2000),
    });
  } catch (err) {
    console.error("[redis] upstashDel failed:", err);
  }
}

interface RateLimitConfig {
  prefix: string;
  maxRequests: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function rateLimit(
  ip: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const { url, token } = getRedisConfig();
  if (!url || !token) {
    return { allowed: true, remaining: config.maxRequests, resetAt: 0 };
  }

  const key = `${config.prefix}:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSeconds;

  try {
    const multiRes = await fetch(`${url}/multi`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["ZREMRANGEBYSCORE", key, 0, windowStart],
        ["ZCARD", key],
        ["ZADD", key, now, `${now}:${crypto.randomUUID().slice(0, 8)}`],
        ["EXPIRE", key, config.windowSeconds],
      ]),
      signal: AbortSignal.timeout(3000),
    });

    if (!multiRes.ok) {
      return { allowed: true, remaining: config.maxRequests, resetAt: 0 };
    }

    const multiData = await multiRes.json();
    const results = multiData as Array<{ result: unknown }>;

    const count = typeof results[1]?.result === "number" ? results[1].result + 1 : 1;

    return {
      allowed: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetAt: now + config.windowSeconds,
    };
  } catch (err) {
    console.error("[redis] rateLimit failed:", err);
    return { allowed: true, remaining: config.maxRequests, resetAt: 0 };
  }
}

