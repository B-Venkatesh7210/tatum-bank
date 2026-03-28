import { getPool } from "../config/db";
import type { Chain } from "../types/custody";
import type { UUID } from "../types/custody";

export type WalletRow = {
  id: UUID;
  user_id: UUID;
  chain: Chain;
  xpub: string;
};

export type VirtualAccountRow = {
  id: UUID;
  user_id: UUID;
  chain: Chain;
  balance: string;
  currency: string;
  tatum_virtual_account_id: string | null;
};

export async function insertWallet(
  userId: string,
  chain: Chain,
  xpub: string
): Promise<{ id: UUID }> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: UUID }>(
    `INSERT INTO wallets (user_id, chain, xpub)
     VALUES ($1::uuid, $2, $3)
     RETURNING id`,
    [userId, chain, xpub]
  );
  const row = rows[0];
  if (!row?.id) {
    throw new Error("insert wallet failed");
  }
  return { id: row.id };
}

export async function findWalletByUserAndChain(
  userId: string,
  chain: Chain
): Promise<WalletRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<WalletRow>(
    `SELECT id, user_id, chain, xpub
     FROM wallets
     WHERE user_id = $1::uuid AND chain = $2
     LIMIT 1`,
    [userId, chain]
  );
  return rows[0] ?? null;
}

export async function findChainForXpub(xpub: string): Promise<Chain | null> {
  const pool = getPool();
  const { rows } = await pool.query<{ chain: Chain }>(
    `SELECT chain FROM wallets WHERE xpub = $1 LIMIT 1`,
    [xpub]
  );
  return rows[0]?.chain ?? null;
}

export async function insertVirtualAccount(input: {
  userId: string;
  chain: Chain;
  balance: string;
  tatumVirtualAccountId: string;
}): Promise<{ id: UUID }> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: UUID }>(
    `INSERT INTO virtual_accounts (user_id, chain, balance, currency, tatum_virtual_account_id)
     VALUES ($1::uuid, $2, $3::numeric, 'native', $4)
     RETURNING id`,
    [input.userId, input.chain, input.balance, input.tatumVirtualAccountId]
  );
  const row = rows[0];
  if (!row?.id) {
    throw new Error("insert virtual account failed");
  }
  return { id: row.id };
}

export async function findVirtualAccountByUserAndChain(
  userId: string,
  chain: Chain
): Promise<VirtualAccountRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<VirtualAccountRow>(
    `SELECT id, user_id, chain, balance::text AS balance, currency, tatum_virtual_account_id
     FROM virtual_accounts
     WHERE user_id = $1::uuid AND chain = $2 AND currency = 'native'
     LIMIT 1`,
    [userId, chain]
  );
  return rows[0] ?? null;
}

export async function insertAddress(input: {
  virtualAccountId: string;
  chain: Chain;
  address: string;
  derivationIndex: number | null;
}): Promise<{ id: UUID }> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: UUID }>(
    `INSERT INTO addresses (virtual_account_id, chain, address, derivation_index)
     VALUES ($1::uuid, $2, $3, $4)
     RETURNING id`,
    [
      input.virtualAccountId,
      input.chain,
      input.address,
      input.derivationIndex,
    ]
  );
  const row = rows[0];
  if (!row?.id) {
    throw new Error("insert address failed");
  }
  return { id: row.id };
}

export type CustodySummaryRow = {
  chain: Chain;
  xpub: string;
  wallet_id: UUID;
  va_id: UUID | null;
  va_balance: string | null;
  tatum_virtual_account_id: string | null;
  addresses: string[];
};

export async function listCustodySummaryForUser(
  userId: string
): Promise<CustodySummaryRow[]> {
  const pool = getPool();
  const { rows: walletRows } = await pool.query<{
    wallet_id: UUID;
    chain: Chain;
    xpub: string;
    va_id: UUID | null;
    va_balance: string | null;
    tatum_virtual_account_id: string | null;
  }>(
    `SELECT w.id AS wallet_id,
            w.chain,
            w.xpub,
            va.id AS va_id,
            va.balance::text AS va_balance,
            va.tatum_virtual_account_id
     FROM wallets w
     LEFT JOIN virtual_accounts va
       ON va.user_id = w.user_id
      AND va.chain = w.chain
      AND va.currency = 'native'
     WHERE w.user_id = $1::uuid
     ORDER BY w.chain`,
    [userId]
  );

  const out: CustodySummaryRow[] = [];
  for (const w of walletRows) {
    let addresses: string[] = [];
    if (w.va_id) {
      const { rows: addrRows } = await pool.query<{ address: string }>(
        `SELECT address FROM addresses
         WHERE virtual_account_id = $1::uuid
         ORDER BY created_at ASC`,
        [w.va_id]
      );
      addresses = addrRows.map((r) => r.address);
    }
    out.push({
      chain: w.chain,
      xpub: w.xpub,
      wallet_id: w.wallet_id,
      va_id: w.va_id,
      va_balance: w.va_balance,
      tatum_virtual_account_id: w.tatum_virtual_account_id,
      addresses,
    });
  }
  return out;
}
