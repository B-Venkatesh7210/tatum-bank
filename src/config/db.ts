import pg from "pg";
import { env } from "./env";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!pool) {
    pool = new pg.Pool({
      connectionString: env.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}
