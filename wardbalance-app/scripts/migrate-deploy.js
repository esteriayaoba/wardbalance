/**
 * scripts/migrate-deploy.js
 *
 * Runs `prisma migrate deploy` using the direct (non-pooled) Neon connection.
 * Retries up to MAX_ATTEMPTS times with an exponential back-off delay to handle
 * Neon cold-start advisory lock timeouts (Prisma error P1002).
 *
 * Why: Neon free-tier databases pause after inactivity. When Vercel starts a
 * build, Neon wakes up but Prisma's 10-second advisory-lock timeout fires
 * before the database is fully ready. Retrying after a short wait resolves it.
 */

"use strict";

const { execSync } = require("child_process");

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 8_000; // 8 s, doubles each retry: 8 → 16 → 32

function sleep(ms) {
  // Synchronous busy-wait — intentional for a CLI build script.
  const end = Date.now() + ms;
  while (Date.now() < end) { /* spin */ }
}

const direct = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!direct) {
  console.log("[migrate-deploy] No DATABASE_URL or DIRECT_URL found — skipping migrations.");
  process.exit(0);
}

// Always use the direct (non-pooled) connection for migrations.
// Prisma advisory locks are incompatible with PgBouncer/Neon pooler.
const env = { ...process.env, DATABASE_URL: direct };

let attempt = 0;
while (attempt < MAX_ATTEMPTS) {
  attempt++;
  try {
    console.log(`[migrate-deploy] Attempt ${attempt}/${MAX_ATTEMPTS} — running prisma migrate deploy...`);
    execSync("npx prisma migrate deploy", { stdio: "inherit", env });
    console.log("[migrate-deploy] ✓ Migrations applied successfully.");
    process.exit(0);
  } catch (err) {
    const isLockTimeout =
      err.stderr?.toString().includes("P1002") ||
      err.stdout?.toString().includes("P1002") ||
      err.message?.includes("P1002") ||
      err.message?.includes("advisory lock");

    if (attempt >= MAX_ATTEMPTS) {
      console.error(`[migrate-deploy] ✗ All ${MAX_ATTEMPTS} attempts failed. Last error:`);
      console.error(err.message ?? err);
      process.exit(1);
    }

    const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
    if (isLockTimeout) {
      console.warn(
        `[migrate-deploy] Advisory lock timeout (P1002). Neon may be waking up. ` +
        `Retrying in ${delayMs / 1000}s...`
      );
    } else {
      console.warn(`[migrate-deploy] Migration error. Retrying in ${delayMs / 1000}s...`);
      console.warn(err.message ?? err);
    }
    sleep(delayMs);
  }
}
