import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .url("DATABASE_URL must be a valid URL"),
  GEMINI_API_KEY: z
    .string()
    .min(1, "GEMINI_API_KEY is required — get one at https://aistudio.google.com/apikey"),
  GEMINI_MODEL: z
    .string()
    .min(1)
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ✗ ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `\n❌ Invalid environment variables:\n${formatted}\n\nSee .env.example for the required values.\n`
    );
  }
  return result.data;
}

/** Validated environment — import this instead of reading process.env directly. */
export const env = validateEnv();
