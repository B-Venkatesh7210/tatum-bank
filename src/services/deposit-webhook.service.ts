import type { PoolClient } from "pg";
import { getPool } from "../config/db";
import { env } from "../config/env";
import type { Chain } from "../types/custody";
import { logger } from "../utils/logger";
import type { ExtractedDepositPayload } from "../utils/tatum-webhook-verify";

export type DepositWebhookResult =
  | {
      ok: true;
      virtualAccountId: string;
      credited: boolean;
      reason?: string;
    }
  | { ok: false; error: string };

async function resolveChain(
  client: PoolClient,
  address: string,
  hint?: Chain
): Promise<Chain | null> {
  if (hint) {
    return hint;
  }
  const { rows } = await client.query<{ chain: string }>(
    `SELECT a.chain
     FROM addresses a
     WHERE (
       (a.chain IN ('ETH', 'MATIC') AND lower(a.address) = lower($1))
       OR (a.chain = 'BTC' AND a.address = $1)
     )`,
    [address]
  );
  if (rows.length === 1) {
    return rows[0].chain as Chain;
  }
  if (rows.length > 1) {
    logger.warn("deposit webhook: multiple chains for address; specify chain in payload", {
      address,
    });
  }
  return null;
}

async function findVirtualAccountForDeposit(
  client: PoolClient,
  address: string,
  chain: Chain
): Promise<string | null> {
  const { rows } = await client.query<{ virtual_account_id: string }>(
    `SELECT a.virtual_account_id
     FROM addresses a
     WHERE a.chain = $2
       AND (
         (a.chain IN ('ETH', 'MATIC') AND lower(a.address) = lower($1))
         OR (a.chain = 'BTC' AND a.address = $1)
       )
     LIMIT 1`,
    [address, chain]
  );
  return rows[0]?.virtual_account_id ?? null;
}

/**
 * Locates the virtual account by monitored deposit address and credits `amount` to `virtual_accounts.balance`.
 * Idempotent when `txId` is present (uses `transactions` unique constraint).
 */
export async function applyDepositFromWebhook(
  payload: ExtractedDepositPayload
): Promise<DepositWebhookResult> {
  if (!env.databaseUrl) {
    logger.error("deposit webhook: DATABASE_URL not configured");
    return { ok: false, error: "database not configured" };
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const chain = await resolveChain(client, payload.address, payload.chain);
    if (!chain) {
      await client.query("ROLLBACK");
      logger.warn("deposit webhook: could not resolve chain for address", {
        address: payload.address,
      });
      return { ok: false, error: "chain resolution failed" };
    }

    const virtualAccountId = await findVirtualAccountForDeposit(
      client,
      payload.address,
      chain
    );
    if (!virtualAccountId) {
      await client.query("ROLLBACK");
      logger.warn("deposit webhook: no virtual account for address", {
        address: payload.address,
        chain,
      });
      return { ok: false, error: "virtual account not found" };
    }

    const amountStr = payload.amount;
    let credited = true;
    let reason: string | undefined;

    if (payload.txId) {
      const ins = await client.query<{ id: string }>(
        `INSERT INTO transactions (
           virtual_account_id,
           tx_hash,
           chain,
           type,
           status,
           amount
         ) VALUES ($1, $2, $3, 'deposit', 'completed', $4::numeric)
         ON CONFLICT (virtual_account_id, tx_hash, chain, type) DO NOTHING
         RETURNING id`,
        [virtualAccountId, payload.txId, chain, amountStr]
      );
      if (ins.rowCount === 0) {
        credited = false;
        reason = "duplicate tx (already credited)";
        logger.info("deposit webhook: duplicate notification skipped", {
          txId: payload.txId,
          virtualAccountId,
        });
      }
    } else {
      logger.warn("deposit webhook: missing tx id; balance may double on retries", {
        virtualAccountId,
        address: payload.address,
      });
    }

    if (credited) {
      await client.query(
        `UPDATE virtual_accounts
         SET balance = balance + $1::numeric,
             updated_at = now()
         WHERE id = $2`,
        [amountStr, virtualAccountId]
      );
    }

    await client.query("COMMIT");

    return {
      ok: true,
      virtualAccountId,
      credited,
      reason,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    logger.error("deposit webhook: database error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "database error",
    };
  } finally {
    client.release();
  }
}
