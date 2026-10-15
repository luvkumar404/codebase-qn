import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

/**
 * Singleton pg Pool + Drizzle instance.
 * In development we stash the pool on `globalThis` so hot-reload doesn't leak connections.
 */

const globalForDb = globalThis as unknown as {
  _pgPool?: Pool;
};

function getPool(): Pool {
  if (!globalForDb._pgPool) {
    globalForDb._pgPool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
    });
  }
  return globalForDb._pgPool;
}

export const pool = getPool();
export const db = drizzle(pool, { schema });
