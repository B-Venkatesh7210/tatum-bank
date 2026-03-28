import type { PoolClient } from "pg";
import { getPool } from "../config/db";
import type { Chain } from "../types/custody";

export type VirtualAccountLedgerRow = {
  dbId: string;
  userId: string;
  chain: Chain;
  tatumVirtualAccountId: string;
};

export async function getVirtualAccountByUserAndChain(
  userId: string,
  chain: Chain
): Promise<VirtualAccountLedgerRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<{
    id: string;
    user_id: string;
    chain: string;
    tatum_virtual_account_id: string | null;
  }>(
    `SELECT va.id,
            va.user_id::text AS user_id,
            va.chain,
            va.tatum_virtual_account_id
     FROM virtual_accounts va
     WHERE va.user_id = $1::uuid
       AND va.chain = $2
       AND va.currency = 'native'
     LIMIT 1`,
    [userId, chain]
  );
  const row = rows[0];
  if (!row?.tatum_virtual_account_id) {
    return null;
  }
  return {
    dbId: row.id,
    userId: row.user_id,
    chain: row.chain as Chain,
    tatumVirtualAccountId: row.tatum_virtual_account_id,
  };
}

export async function getVirtualAccountByTatumId(
  tatumAccountId: string
): Promise<VirtualAccountLedgerRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<{
    id: string;
    user_id: string;
    chain: string;
    tatum_virtual_account_id: string | null;
  }>(
    `SELECT va.id,
            va.user_id::text AS user_id,
            va.chain,
            va.tatum_virtual_account_id
     FROM virtual_accounts va
     WHERE va.tatum_virtual_account_id = $1
     LIMIT 1`,
    [tatumAccountId]
  );
  const row = rows[0];
  if (!row?.tatum_virtual_account_id) {
    return null;
  }
  return {
    dbId: row.id,
    userId: row.user_id,
    chain: row.chain as Chain,
    tatumVirtualAccountId: row.tatum_virtual_account_id,
  };
}

export async function applyInternalTransferBalances(
  client: PoolClient,
  senderVaDbId: string,
  recipientVaDbId: string,
  amount: string
): Promise<void> {
  const u1 = await client.query(
    `UPDATE virtual_accounts
     SET balance = balance - $1::numeric,
         updated_at = now()
     WHERE id = $2::uuid
       AND balance >= $1::numeric
     RETURNING id`,
    [amount, senderVaDbId]
  );
  if (u1.rowCount === 0) {
    throw new Error("insufficient balance");
  }

  await client.query(
    `UPDATE virtual_accounts
     SET balance = balance + $1::numeric,
         updated_at = now()
     WHERE id = $2::uuid`,
    [amount, recipientVaDbId]
  );
}

export async function insertInternalTransferTransactions(
  client: PoolClient,
  params: {
    senderDbId: string;
    recipientDbId: string;
    chain: Chain;
    amount: string;
    reference: string;
  }
): Promise<void> {
  const note = `internal:${params.reference}`;
  await client.query(
    `INSERT INTO transactions (
       virtual_account_id,
       tx_hash,
       chain,
       type,
       status,
       amount,
       counterparty_address
     ) VALUES ($1::uuid, $2, $3, 'internal_transfer', 'completed', $4::numeric, $5)`,
    [params.senderDbId, params.reference, params.chain, params.amount, note]
  );
  await client.query(
    `INSERT INTO transactions (
       virtual_account_id,
       tx_hash,
       chain,
       type,
       status,
       amount,
       counterparty_address
     ) VALUES ($1::uuid, $2, $3, 'internal_transfer', 'completed', $4::numeric, $5)`,
    [params.recipientDbId, params.reference, params.chain, params.amount, note]
  );
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
