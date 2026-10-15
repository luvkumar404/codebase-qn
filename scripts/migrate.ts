/**
 * Migration script: runs `drizzle-kit push` then applies custom SQL migrations.
 *
 * Usage: npx tsx scripts/migrate.ts
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { Pool } from "pg";
import path from "path";

// Ensure .env is loaded if running directly
if (!process.env.DATABASE_URL) {
  try {
    if (typeof process.loadEnvFile === "function") {
      process.loadEnvFile();
    }
  } catch {
    // Ignore if .env doesn't exist
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL is not set. Please provide it in .env or your environment."
    );
  }

  // 1. Push the Drizzle schema
  console.log("▶ Running drizzle-kit push...");
  execSync("npx drizzle-kit push --force", {
    stdio: "inherit",
    env: process.env,
  });

  // 2. Apply custom SQL migrations
  const pool = new Pool({ connectionString: dbUrl });
  try {
    const sqlPath = path.join(
      __dirname,
      "..",
      "drizzle",
      "0001_add_tsv_column.sql"
    );
    const sql = readFileSync(sqlPath, "utf-8");
    console.log("▶ Applying custom SQL migration: 0001_add_tsv_column.sql");
    await pool.query(sql);
    console.log("✅ All migrations applied successfully.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
