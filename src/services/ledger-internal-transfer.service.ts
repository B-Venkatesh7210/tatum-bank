import axios, { type AxiosInstance } from "axios";
import { createTatumHttpClient } from "../config/tatum-http";
import { env } from "../config/env";
import type { Chain } from "../types/custody";
import { logger } from "../utils/logger";
import {
  applyInternalTransferBalances,
  getVirtualAccountByTatumId,
  getVirtualAccountByUserAndChain,
  insertInternalTransferTransactions,
  type VirtualAccountLedgerRow,
  withTransaction,
} from "../repositories/ledger-transfer.repository";

/**
 * Body for `POST /v3/ledger/transaction` — off-chain only, same currency across both accounts.
 * @see https://docs.tatum.io/reference/sendtransaction
 */
export type CreateLedgerTransactionBody = {
  senderAccountId: string;
  recipientAccountId: string;
  amount: string;
  anonymous?: boolean;
  compliant?: boolean;
  transactionCode?: string;
  paymentId?: string;
  recipientNote?: string;
  senderNote?: string;
  baseRate?: number;
};

export type InternalLedgerTransferResult = {
  reference: string;
  senderTatumAccountId: string;
  recipientTatumAccountId: string;
  senderDbId: string;
  recipientDbId: string;
  chain: Chain;
};

const AMOUNT_RE = /^[+]?((\d+(\.\d*)?)|(\.\d+))$/;

function assertAmount(amount: string): void {
  if (!AMOUNT_RE.test(amount.trim())) {
    throw new Error("amount has invalid format");
  }
}

function wrapAxiosError(context: string, err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string } | undefined)?.message;
    return new Error(`${context}: ${msg || err.message}`);
  }
  return err instanceof Error ? err : new Error(`${context}: ${String(err)}`);
}

async function postLedgerTransaction(
  http: AxiosInstance,
  body: CreateLedgerTransactionBody
): Promise<{ reference: string }> {
  const { data } = await http.post<{ reference: string }>(
    "/v3/ledger/transaction",
    body
  );
  if (!data?.reference) {
    throw new Error("Tatum response missing reference");
  }
  return data;
}

function assertSameChain(a: VirtualAccountLedgerRow, b: VirtualAccountLedgerRow): void {
  if (a.chain !== b.chain) {
    throw new Error("sender and recipient must use the same chain for this transfer");
  }
}

/**
 * Internal ledger transfer using Tatum account IDs already stored in your DB.
 * 1) `POST /v3/ledger/transaction`
 * 2) Mirror balances in PostgreSQL + insert `transactions` rows.
 */
export class LedgerInternalTransferService {
  private readonly http: AxiosInstance;

  constructor(options?: { apiKey?: string; baseUrl?: string }) {
    this.http = createTatumHttpClient(options);
  }

  /**
   * Resolve both accounts by Tatum virtual account id, call ledger API, update DB.
   */
  async transferByTatumAccountIds(input: {
    senderTatumAccountId: string;
    recipientTatumAccountId: string;
    amount: string;
    /** Optional extras forwarded to Tatum */
    paymentId?: string;
    anonymous?: boolean;
    transactionCode?: string;
    recipientNote?: string;
    senderNote?: string;
  }): Promise<InternalLedgerTransferResult> {
    assertAmount(input.amount);
    const amount = input.amount.trim();

    if (input.senderTatumAccountId === input.recipientTatumAccountId) {
      throw new Error("sender and recipient Tatum account ids must differ");
    }

    if (!env.databaseUrl) {
      throw new Error("DATABASE_URL is required to sync balances");
    }

    const sender = await getVirtualAccountByTatumId(input.senderTatumAccountId);
    const recipient = await getVirtualAccountByTatumId(input.recipientTatumAccountId);
    if (!sender || !recipient) {
      throw new Error(
        "unknown virtual account: ensure tatum_virtual_account_id is stored for both accounts"
      );
    }
    assertSameChain(sender, recipient);

    let reference: string;
    try {
      const out = await postLedgerTransaction(this.http, {
        senderAccountId: input.senderTatumAccountId,
        recipientAccountId: input.recipientTatumAccountId,
        amount,
        ...(input.paymentId !== undefined ? { paymentId: input.paymentId } : {}),
        ...(input.anonymous !== undefined ? { anonymous: input.anonymous } : {}),
        ...(input.transactionCode !== undefined
          ? { transactionCode: input.transactionCode }
          : {}),
        ...(input.recipientNote !== undefined
          ? { recipientNote: input.recipientNote }
          : {}),
        ...(input.senderNote !== undefined ? { senderNote: input.senderNote } : {}),
      });
      reference = out.reference;
    } catch (err) {
      throw wrapAxiosError("POST /v3/ledger/transaction failed", err);
    }

    try {
      await withTransaction(async (client) => {
        await applyInternalTransferBalances(
          client,
          sender.dbId,
          recipient.dbId,
          amount
        );
        await insertInternalTransferTransactions(client, {
          senderDbId: sender.dbId,
          recipientDbId: recipient.dbId,
          chain: sender.chain,
          amount,
          reference,
        });
      });
    } catch (err) {
      logger.error("ledger transfer: Tatum succeeded but DB sync failed — reconcile manually", {
        reference,
        err: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    logger.info("ledger.internal_transfer.completed", {
      reference,
      chain: sender.chain,
      senderTatum: input.senderTatumAccountId,
      recipientTatum: input.recipientTatumAccountId,
    });

    return {
      reference,
      senderTatumAccountId: input.senderTatumAccountId,
      recipientTatumAccountId: input.recipientTatumAccountId,
      senderDbId: sender.dbId,
      recipientDbId: recipient.dbId,
      chain: sender.chain,
    };
  }

  /**
   * Resolve native virtual accounts for two users on the same chain, then transfer.
   */
  async transferByUserIds(input: {
    senderUserId: string;
    recipientUserId: string;
    chain: Chain;
    amount: string;
    paymentId?: string;
    anonymous?: boolean;
  }): Promise<InternalLedgerTransferResult> {
    assertAmount(input.amount);

    if (input.senderUserId === input.recipientUserId) {
      throw new Error("sender and recipient user ids must differ");
    }

    const sender = await getVirtualAccountByUserAndChain(
      input.senderUserId,
      input.chain
    );
    const recipient = await getVirtualAccountByUserAndChain(
      input.recipientUserId,
      input.chain
    );
    if (!sender || !recipient) {
      throw new Error(
        "virtual account not found for one or both users (native currency row required)"
      );
    }

    return this.transferByTatumAccountIds({
      senderTatumAccountId: sender.tatumVirtualAccountId,
      recipientTatumAccountId: recipient.tatumVirtualAccountId,
      amount: input.amount.trim(),
      paymentId: input.paymentId,
      anonymous: input.anonymous,
    });
  }
}

const shared = new LedgerInternalTransferService();

export function createLedgerInternalTransferService(
  options?: ConstructorParameters<typeof LedgerInternalTransferService>[0]
): LedgerInternalTransferService {
  if (options) {
    return new LedgerInternalTransferService(options);
  }
  return shared;
}

/** Direct `POST /v3/ledger/transaction` + DB sync (resolve VA rows by Tatum ids). */
export async function transferInternalLedger(
  input: Parameters<LedgerInternalTransferService["transferByTatumAccountIds"]>[0]
): Promise<InternalLedgerTransferResult> {
  return shared.transferByTatumAccountIds(input);
}

/** Same as {@link transferInternalLedger}, but resolves Tatum ids from `userId` + `chain`. */
export async function transferInternalLedgerBetweenUsers(
  input: Parameters<LedgerInternalTransferService["transferByUserIds"]>[0]
): Promise<InternalLedgerTransferResult> {
  return shared.transferByUserIds(input);
}
