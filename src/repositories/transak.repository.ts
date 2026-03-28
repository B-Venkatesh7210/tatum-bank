import { getPool } from "../config/db";
import type { Chain } from "../types/custody";

/** Earliest known deposit address for the user’s native VA on this chain (on-ramp target). */
export async function getUserDepositAddress(
  userId: string,
  chain: Chain
): Promise<string | null> {
  const pool = getPool();
  const { rows } = await pool.query<{ address: string }>(
    `SELECT a.address
     FROM addresses a
     INNER JOIN virtual_accounts va ON va.id = a.virtual_account_id
     WHERE va.user_id = $1::uuid
       AND a.chain = $2
     ORDER BY a.created_at ASC NULLS LAST
     LIMIT 1`,
    [userId, chain]
  );
  return rows[0]?.address ?? null;
}
