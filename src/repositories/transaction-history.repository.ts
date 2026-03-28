import { getPool } from "../config/db";
import type {
  Chain,
  TransactionStatus,
  TransactionType,
} from "../types/custody";

export type TransactionHistoryRow = {
  id: string;
  amount: string;
  type: TransactionType;
  status: TransactionStatus;
  tx_hash: string;
  chain: Chain;
  created_at: Date;
};

/**
 * Persist a ledger row (deposits, withdrawals, internal transfers). Prefer one path per logical tx to avoid duplicates.
 */
export async function insertTransactionRecord(params: {
  virtualAccountDbId: string;
  txHash: string;
  chain: Chain;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  fee?: string | null;
  counterpartyAddress?: string | null;
}): Promise<string> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO transactions (
       virtual_account_id,
       tx_hash,
       chain,
       type,
       status,
       amount,
       fee,
       counterparty_address
     ) VALUES ($1::uuid, $2, $3, $4, $5, $6::numeric, $7::numeric, $8)
     RETURNING id::text AS id`,
    [
      params.virtualAccountDbId,
      params.txHash,
      params.chain,
      params.type,
      params.status,
      params.amount,
      params.fee ?? null,
      params.counterpartyAddress ?? null,
    ]
  );
  const id = rows[0]?.id;
  if (!id) {
    throw new Error("insert transaction failed");
  }
  return id;
}

export async function findTransactionsByUserId(
  userId: string
): Promise<TransactionHistoryRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<{
    id: string;
    amount: string;
    type: string;
    status: string;
    tx_hash: string;
    chain: string;
    created_at: Date;
  }>(
    `SELECT t.id::text AS id,
            t.amount::text AS amount,
            t.type,
            t.status,
            t.tx_hash,
            t.chain,
            t.created_at
     FROM transactions t
     INNER JOIN virtual_accounts va ON va.id = t.virtual_account_id
     WHERE va.user_id = $1::uuid
     ORDER BY t.created_at DESC`,
    [userId]
  );

  return rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    type: r.type as TransactionType,
    status: r.status as TransactionStatus,
    tx_hash: r.tx_hash,
    chain: r.chain as Chain,
    created_at: r.created_at,
  }));
}
