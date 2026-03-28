import { getPool } from "../config/db";
import type { UUID } from "../types/custody";

export type UserRecord = {
  id: UUID;
  email: string;
  password_hash: string;
};

export async function insertUser(
  email: string,
  passwordHash: string
): Promise<{ id: UUID }> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: UUID }>(
    `INSERT INTO users (email, password_hash)
     VALUES (lower(trim($1)), $2)
     RETURNING id`,
    [email, passwordHash]
  );
  const row = rows[0];
  if (!row?.id) {
    throw new Error("insert user failed");
  }
  return { id: row.id };
}

export async function findUserByEmail(
  email: string
): Promise<UserRecord | null> {
  const pool = getPool();
  const { rows } = await pool.query<UserRecord>(
    `SELECT id, email::text AS email, password_hash
     FROM users
     WHERE email = lower(trim($1))
     LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const pool = getPool();
  const { rows } = await pool.query<UserRecord>(
    `SELECT id, email::text AS email, password_hash
     FROM users
     WHERE id = $1::uuid
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}
