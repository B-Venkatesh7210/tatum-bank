import type { PoolClient } from "pg";
import { getPool } from "../config/db";
import type { Chain } from "../types/custody";

export type SenderWithdrawalContext = {
  virtualAccountDbId: string;
  tatumVirtualAccountId: string;
  balance: string;
  walletXpub: string;
  tatumSignatureId: string | null;
  kmsDerivationIndex: number;
};

export type InternalRecipientContext = {
  userId: string;
  virtualAccountDbId: string;
  tatumVirtualAccountId: string;
};

export async function loadSenderWithdrawalContext(
  userId: string,
  chain: Chain
): Promise<SenderWithdrawalContext | null> {
  const pool = getPool();
  const { rows } = await pool.query<{
    virtual_account_db_id: string;
    tatum_virtual_account_id: string | null;
    balance: string;
    xpub: string;
    tatum_signature_id: string | null;
    kms_derivation_index: string | null;
  }>(
    `SELECT va.id AS virtual_account_db_id,
            va.tatum_virtual_account_id,
            va.balance::text AS balance,
            w.xpub,
            w.tatum_signature_id,
            w.kms_derivation_index::text AS kms_derivation_index
     FROM virtual_accounts va
     INNER JOIN wallets w
       ON w.user_id = va.user_id AND w.chain = va.chain
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
    virtualAccountDbId: row.virtual_account_db_id,
    tatumVirtualAccountId: row.tatum_virtual_account_id,
    balance: row.balance,
    walletXpub: row.xpub,
    tatumSignatureId: row.tatum_signature_id,
    kmsDerivationIndex: row.kms_derivation_index
      ? Number.parseInt(row.kms_derivation_index, 10)
      : 0,
  };
}

export async function findInternalRecipientByAddress(
  chain: Chain,
  destinationAddress: string
): Promise<InternalRecipientContext | null> {
  const pool = getPool();
  const { rows } = await pool.query<{
    user_id: string;
    virtual_account_db_id: string;
    tatum_virtual_account_id: string | null;
  }>(
    `SELECT va.user_id::text AS user_id,
            va.id AS virtual_account_db_id,
            va.tatum_virtual_account_id
     FROM addresses a
     INNER JOIN virtual_accounts va ON va.id = a.virtual_account_id
     WHERE a.chain = $1
       AND (
         (a.chain IN ('ETH', 'MATIC') AND lower(a.address) = lower($2))
         OR (a.chain = 'BTC' AND a.address = $2)
       )
     LIMIT 1`,
    [chain, destinationAddress]
  );

  const row = rows[0];
  if (!row?.tatum_virtual_account_id) {
    return null;
  }

  return {
    userId: row.user_id,
    virtualAccountDbId: row.virtual_account_db_id,
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

export async function applyExternalDebitBalance(
  client: PoolClient,
  senderVaDbId: string,
  amount: string
): Promise<void> {
  const r = await client.query(
    `UPDATE virtual_accounts
     SET balance = balance - $1::numeric,
         updated_at = now()
     WHERE id = $2::uuid
       AND balance >= $1::numeric
     RETURNING id`,
    [amount, senderVaDbId]
  );
  if (r.rowCount === 0) {
    throw new Error("insufficient balance");
  }
}

export async function insertLedgerTransaction(
  client: PoolClient,
  params: {
    virtualAccountDbId: string;
    txHash: string;
    chain: Chain;
    type: "withdrawal" | "internal_transfer";
    amount: string;
    counterpartyAddress: string;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO transactions (
       virtual_account_id,
       tx_hash,
       chain,
       type,
       status,
       amount,
       counterparty_address
     ) VALUES ($1::uuid, $2, $3, $4, 'completed', $5::numeric, $6)`,
    [
      params.virtualAccountDbId,
      params.txHash,
      params.chain,
      params.type,
      params.amount,
      params.counterpartyAddress,
    ]
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
