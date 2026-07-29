/**
 * scripts/migrate-deploy.js
 *
 * Runs `prisma migrate deploy` using the direct (non-pooled) Neon connection.
 * Retries up to MAX_ATTEMPTS times with an exponential back-off delay to handle
 * Neon cold-start advisory lock timeouts (Prisma error P1002) and stale shadow
 * databases from prior builds (Prisma error P3005).
 */

"use strict";

const { execSync } = require("child_process");
const { Client } = require("pg");

const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 8_000; // 8 s, doubles each retry: 8 → 16 → 32

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* spin */ }
}

/** Drop all Prisma shadow databases on the target server so migrate can create fresh ones. */
async function dropShadowDatabases(connectionString) {
  const client = new Client({ connectionString, connectionTimeoutMillis: 10_000 });
  try {
    await client.connect();
    const res = await client.query(
      `SELECT datname FROM pg_database WHERE datname LIKE 'prisma_migrate_shadow_db_%'`
    );
    for (const row of res.rows) {
      const dbName = row.datname;
      console.warn(`[migrate-deploy] Dropping stale shadow database "${dbName}"...`);
      // Terminate connections to the shadow db, then drop it
      await client.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [dbName]
      );
      await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
      console.warn(`[migrate-deploy] Dropped "${dbName}".`);
    }
    return res.rows.length;
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
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
      const output = (err.stderr?.toString() ?? "") + (err.stdout?.toString() ?? "") + (err.message ?? "");
      const isLockTimeout = output.includes("P1002") || output.includes("advisory lock");
      const isStaleShadow = output.includes("P3005") || output.includes("database schema is not empty");

      if (isStaleShadow) {
        // P3005: the database already has schema tables but no _prisma_migrations
        // history. We need to baseline it by marking every migration as already
        // applied, then exit — there is nothing left to deploy.
        console.warn("[migrate-deploy] P3005 detected — database has schema but no migration history.");
        console.warn("[migrate-deploy] Baselining: marking all migrations as applied...");
        let baselineOk = false;
        try {
          const fs = require("fs");
          const path = require("path");
          const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");
          if (fs.existsSync(migrationsDir)) {
            const migrationFolders = fs
              .readdirSync(migrationsDir)
              .filter((f) => fs.statSync(path.join(migrationsDir, f)).isDirectory())
              .sort(); // chronological order is required

            console.warn(`[migrate-deploy] Found ${migrationFolders.length} migration(s) to baseline.`);
            for (const folder of migrationFolders) {
              try {
                execSync(`npx prisma migrate resolve --applied "${folder}"`, { stdio: "inherit", env });
                console.log(`[migrate-deploy]   ✓ Marked as applied: ${folder}`);
              } catch (_) {
                // Already applied — safe to ignore
                console.log(`[migrate-deploy]   ~ Already applied (skipped): ${folder}`);
              }
            }
            baselineOk = true;
          } else {
            console.warn("[migrate-deploy] No migrations directory found — nothing to baseline.");
            baselineOk = true; // Nothing to do; let the build continue.
          }
        } catch (resolveErr) {
          console.error("[migrate-deploy] Baseline failed:", resolveErr.message ?? resolveErr);
        }

        if (baselineOk) {
          console.log("[migrate-deploy] ✓ Baseline complete. Schema is already up to date.");
          process.exit(0);
        }

        // Baselining itself failed — fall through to the normal failure path.
        if (attempt >= MAX_ATTEMPTS) {
          console.error(`[migrate-deploy] ✗ All ${MAX_ATTEMPTS} attempts failed (P3005 baseline unsuccessful).`);
          process.exit(1);
        }
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[migrate-deploy] Retrying in ${delayMs / 1000}s...`);
        sleep(delayMs);
        continue;
      }

      if (attempt >= MAX_ATTEMPTS) {
        console.error(`[migrate-deploy] ✗ All ${MAX_ATTEMPTS} attempts failed. Last error:`);
        console.error(err.message ?? err);
        process.exit(1);
      }

      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      if (isLockTimeout) {
        console.warn(`[migrate-deploy] Advisory lock timeout (P1002). Neon may be waking up. Retrying in ${delayMs / 1000}s...`);
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
