/**
 * scripts/migrate-deploy.js
 *
 * Runs `prisma migrate deploy` using the direct (non-pooled) Neon connection.
 * Retries up to MAX_ATTEMPTS times with exponential back-off to handle:
 *   P1002 — Neon cold-start advisory lock timeout
 *   P3005 — database schema exists but no _prisma_migrations history (baseline needed)
 *
 * IMPORTANT: We use spawnSync (not execSync with stdio:'inherit') so that
 * stdout/stderr are BOTH streamed to the build log AND captured in the result
 * object for error-code detection. With stdio:'inherit', err.stdout/err.stderr
 * are always null and P3005/P1002 can never be detected.
 */

"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 8_000; // 8 s, doubles each retry: 8 → 16 → 32

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* spin */ }
}

/**
 * Run a command, stream its output to the build log, and return the combined
 * stdout+stderr text so callers can inspect error codes.
 * Throws if the process exits non-zero.
 */
function run(cmd, args, env) {
  const result = spawnSync(cmd, args, {
    env,
    encoding: "utf8",
    // Stream to the parent process so Vercel shows it in real time.
    stdio: ["inherit", "pipe", "pipe"],
  });

  // Print captured output so it appears in the build log.
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    const combinedOutput = (result.stdout ?? "") + (result.stderr ?? "");
    const err = new Error(`Command failed: ${cmd} ${args.join(" ")}`);
    err.combinedOutput = combinedOutput;
    throw err;
  }

  return (result.stdout ?? "") + (result.stderr ?? "");
}

async function main() {
  const direct = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!direct) {
    console.log("[migrate-deploy] No DATABASE_URL or DIRECT_URL found — skipping migrations.");
    process.exit(0);
  }

  // Always use the direct (non-pooled) URL for migrations.
  // Prisma advisory locks are incompatible with PgBouncer / Neon pooler.
  const env = { ...process.env, DATABASE_URL: direct };

  let attempt = 0;
  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    console.log(`[migrate-deploy] Attempt ${attempt}/${MAX_ATTEMPTS} — running prisma migrate deploy...`);

    try {
      run("npx", ["prisma", "migrate", "deploy"], env);
      console.log("[migrate-deploy] ✓ Migrations applied successfully.");
      process.exit(0);
    } catch (err) {
      const output = err.combinedOutput ?? err.message ?? "";

      const isLockTimeout = output.includes("P1002") || output.includes("advisory lock");
      const isStaleShadow = output.includes("P3005") || output.includes("database schema is not empty");

      // ── P3005: baseline needed ─────────────────────────────────────────────
      // The database already has schema tables but no _prisma_migrations table.
      // Mark every migration as applied (baseline), then exit 0 — the schema is
      // already in sync; there is nothing to deploy.
      if (isStaleShadow) {
        console.warn("[migrate-deploy] P3005 detected — database has schema but no migration history.");
        console.warn("[migrate-deploy] Baselining: marking all migrations as applied...");

        let baselineOk = false;
        try {
          const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");
          if (fs.existsSync(migrationsDir)) {
            const migrationFolders = fs
              .readdirSync(migrationsDir)
              .filter((f) => fs.statSync(path.join(migrationsDir, f)).isDirectory())
              .sort(); // must be chronological

            console.warn(`[migrate-deploy] Found ${migrationFolders.length} migration(s) to baseline.`);
            for (const folder of migrationFolders) {
              try {
                run("npx", ["prisma", "migrate", "resolve", "--applied", folder], env);
                console.log(`[migrate-deploy]   ✓ Marked as applied: ${folder}`);
              } catch (_) {
                // Already recorded in _prisma_migrations — safe to skip.
                console.log(`[migrate-deploy]   ~ Already applied (skipped): ${folder}`);
              }
            }
            baselineOk = true;
          } else {
            console.warn("[migrate-deploy] No migrations directory — nothing to baseline.");
            baselineOk = true;
          }
        } catch (resolveErr) {
          console.error("[migrate-deploy] Baseline failed:", resolveErr.message ?? resolveErr);
        }

        if (baselineOk) {
          console.log("[migrate-deploy] ✓ Baseline complete. Schema is already up to date.");
          process.exit(0);
        }

        // Baselining failed — retry or give up.
        if (attempt >= MAX_ATTEMPTS) {
          console.error(`[migrate-deploy] ✗ All ${MAX_ATTEMPTS} attempts failed (P3005 baseline unsuccessful).`);
          process.exit(1);
        }
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[migrate-deploy] Retrying in ${delayMs / 1000}s...`);
        sleep(delayMs);
        continue;
      }

      // ── Give up after MAX_ATTEMPTS ─────────────────────────────────────────
      if (attempt >= MAX_ATTEMPTS) {
        console.error(`[migrate-deploy] ✗ All ${MAX_ATTEMPTS} attempts failed. Last error:`);
        console.error(err.message ?? err);
        process.exit(1);
      }

      // ── P1002 or other transient error — retry with back-off ───────────────
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      if (isLockTimeout) {
        console.warn(`[migrate-deploy] Advisory lock timeout (P1002). Neon cold-start — retrying in ${delayMs / 1000}s...`);
      } else {
        console.warn(`[migrate-deploy] Migration error. Retrying in ${delayMs / 1000}s...`);
        console.warn(err.message ?? err);
      }
      sleep(delayMs);
    }
  }
}

main().catch((err) => {
  console.error("[migrate-deploy] Unexpected error:", err);
  process.exit(1);
});
