import { defineConfig } from "drizzle-kit";

// Load .env if running standalone via drizzle-kit CLI
if (!process.env.DATABASE_URL) {
  try {
    if (typeof process.loadEnvFile === "function") {
      process.loadEnvFile();
    }
  } catch {
    // Ignore if .env doesn't exist yet
  }
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
