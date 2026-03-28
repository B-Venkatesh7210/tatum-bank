/**
 * Domain types aligned with `db/schema.sql` (PostgreSQL).
 * Row shapes use snake_case to match column names from `pg` / raw SQL.
 */

export type Chain = "ETH" | "MATIC" | "BTC";

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "internal_transfer"
  | "fee";

export type TransactionStatus =
  | "pending"
  | "confirming"
  | "completed"
  | "failed"
  | "cancelled";

export type UUID = string;

export interface UserRow {
  id: UUID;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface WalletRow {
  id: UUID;
  user_id: UUID;
  chain: Chain;
  xpub: string;
  tatum_signature_id: string | null;
  kms_derivation_index: number;
  created_at: Date;
  updated_at: Date;
}

export interface VirtualAccountRow {
  id: UUID;
  user_id: UUID;
  chain: Chain;
  balance: string;
  currency: string;
  tatum_virtual_account_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AddressRow {
  id: UUID;
  virtual_account_id: UUID;
  chain: Chain;
  address: string;
  derivation_index: number | null;
  created_at: Date;
}

export interface TransactionRow {
  id: UUID;
  virtual_account_id: UUID;
  tx_hash: string;
  chain: Chain;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  fee: string | null;
  counterparty_address: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Insert payloads (omit DB-generated fields where applicable) */
export type NewUser = Pick<UserRow, "email">;

export type NewWallet = Pick<WalletRow, "user_id" | "chain" | "xpub">;

export type NewVirtualAccount = Pick<
  VirtualAccountRow,
  "user_id" | "chain" | "balance" | "currency" | "tatum_virtual_account_id"
>;

export type NewAddress = Pick<
  AddressRow,
  "virtual_account_id" | "chain" | "address" | "derivation_index"
>;

export type NewTransaction = Pick<
  TransactionRow,
  | "virtual_account_id"
  | "tx_hash"
  | "chain"
  | "type"
  | "status"
  | "amount"
  | "fee"
  | "counterparty_address"
>;
