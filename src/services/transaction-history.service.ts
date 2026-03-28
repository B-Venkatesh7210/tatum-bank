import { env } from "../config/env";
import {
  findTransactionsByUserId,
  insertTransactionRecord,
} from "../repositories/transaction-history.repository";
import type {
  Chain,
  TransactionStatus,
  TransactionType,
} from "../types/custody";

export type TransactionHistoryItem = {
  id: string;
  amount: string;
  type: TransactionType;
  status: TransactionStatus;
  txHash: string;
  chain: Chain;
  createdAt: string;
};

export type RecordTransactionInput = {
  virtualAccountDbId: string;
  txHash: string;
  chain: Chain;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  fee?: string | null;
  counterpartyAddress?: string | null;
};

/**
 * Lists all `transactions` rows for every virtual account owned by the user
 * (deposits, withdrawals, internal transfers, fees).
 */
export async function getUserTransactionHistory(
  userId: string
): Promise<TransactionHistoryItem[]> {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const rows = await findTransactionsByUserId(userId);
  return rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    type: r.type,
    status: r.status,
    txHash: r.tx_hash,
    chain: r.chain,
    createdAt: r.created_at.toISOString(),
  }));
}

/**
 * Store a single transaction row (deposit, withdrawal, etc.). Use when adding new flows
 * so history stays consistent with `GET /transactions/:userId`.
 */
export async function recordTransaction(
  input: RecordTransactionInput
): Promise<string> {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }
  return insertTransactionRecord(input);
}

export class TransactionHistoryService {
  getForUser(userId: string): Promise<TransactionHistoryItem[]> {
    return getUserTransactionHistory(userId);
  }

  record(input: RecordTransactionInput): Promise<string> {
    return recordTransaction(input);
  }
}

const shared = new TransactionHistoryService();

export function createTransactionHistoryService(): TransactionHistoryService {
  return shared;
}
