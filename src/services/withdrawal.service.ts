import axios, { type AxiosInstance } from "axios";
import { createTatumHttpClient } from "../config/tatum-http";
import { env } from "../config/env";
import type { Chain } from "../types/custody";
import { logger } from "../utils/logger";
import {
  applyExternalDebitBalance,
  applyInternalTransferBalances,
  findInternalRecipientByAddress,
  insertLedgerTransaction,
  loadSenderWithdrawalContext,
  withTransaction,
} from "../repositories/withdrawal.repository";

export type WithdrawalRequest = {
  userId: string;
  chain: Chain;
  /** Decimal string, e.g. "0.01" */
  amount: string;
  destinationAddress: string;
};

export type WithdrawalSuccess =
  | {
      mode: "internal_va_transfer";
      reference: string;
      senderVirtualAccountId: string;
      recipientVirtualAccountId: string;
    }
  | {
      mode: "external_blockchain";
      tatumWithdrawalId: string;
      txId?: string;
      kmsPending?: {
        withdrawalId: string;
        signatureTemplateId: string;
      };
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

function resolveKmsSignatureId(
  chain: Chain,
  ctx: Awaited<ReturnType<typeof loadSenderWithdrawalContext>>
): string {
  if (!ctx) {
    return "";
  }
  if (ctx.tatumSignatureId) {
    return ctx.tatumSignatureId;
  }
  switch (chain) {
    case "ETH":
      return env.tatumKmsSignatureIdEth;
    case "MATIC":
      return env.tatumKmsSignatureIdMatic;
    case "BTC":
      return env.tatumKmsSignatureIdBtc;
    default:
      return "";
  }
}

function resolveDerivationIndex(
  ctx: Awaited<ReturnType<typeof loadSenderWithdrawalContext>>
): number {
  if (!ctx) {
    return env.tatumKmsDerivationIndex;
  }
  if (Number.isFinite(ctx.kmsDerivationIndex)) {
    return ctx.kmsDerivationIndex;
  }
  return env.tatumKmsDerivationIndex;
}

type OffchainParsed =
  | { kind: "completed"; txId: string; withdrawalId: string }
  | {
      kind: "pending_kms";
      withdrawalId: string;
      signatureTemplateId: string;
    };

function parseOffchainTransferResponse(data: unknown): OffchainParsed {
  if (!data || typeof data !== "object") {
    throw new Error("empty Tatum response");
  }
  const o = data as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : undefined;
  const txId = typeof o.txId === "string" ? o.txId : undefined;
  const signatureTemplate =
    typeof o.signatureId === "string" ? o.signatureId : undefined;

  if (txId && id) {
    return { kind: "completed", txId, withdrawalId: id };
  }
  if (signatureTemplate && id) {
    return {
      kind: "pending_kms",
      withdrawalId: id,
      signatureTemplateId: signatureTemplate,
    };
  }
  throw new Error("unexpected offchain transfer response shape");
}

/**
 * Logs the KMS pending-template flow. Tatum KMS (separate process) signs and broadcasts;
 * this does not perform a signature itself.
 */
export function simulateKmsSigningLog(params: {
  chain: Chain;
  withdrawalId: string;
  signatureTemplateId: string;
  walletSignatureId: string;
}): void {
  if (!env.tatumKmsSimulateLogging) {
    return;
  }
  logger.info("kms.simulate: pending withdrawal awaiting KMS daemon", {
    chain: params.chain,
    withdrawalId: params.withdrawalId,
    signatureTemplateId: params.signatureTemplateId,
    walletSignatureId: params.walletSignatureId,
    hint: "Run tatum-kms with the same signatureId; complete via PUT /v3/kms/{id}/{txId} after broadcast",
  });
}

async function postLedgerTransfer(
  http: AxiosInstance,
  body: {
    senderAccountId: string;
    recipientAccountId: string;
    amount: string;
  }
): Promise<{ reference: string }> {
  const { data } = await http.post<{ reference: string }>(
    "/v3/ledger/transaction",
    body
  );
  if (!data?.reference) {
    throw new Error("ledger transfer missing reference");
  }
  return data;
}

async function postExternalEvmTransfer(
  http: AxiosInstance,
  chain: "ETH" | "MATIC",
  body: {
    senderAccountId: string;
    address: string;
    amount: string;
    signatureId: string;
    index?: number;
  }
): Promise<unknown> {
  const path =
    chain === "ETH"
      ? "/v3/offchain/ethereum/transfer"
      : "/v3/offchain/polygon/transfer";
  const { data } = await http.post(path, {
    senderAccountId: body.senderAccountId,
    address: body.address,
    amount: body.amount,
    signatureId: body.signatureId,
    ...(body.index !== undefined ? { index: body.index } : {}),
  });
  return data;
}

async function postExternalBtcTransfer(
  http: AxiosInstance,
  body: {
    senderAccountId: string;
    address: string;
    amount: string;
    signatureId: string;
    xpub: string;
  }
): Promise<unknown> {
  const { data } = await http.post("/v3/offchain/bitcoin/transfer", {
    senderAccountId: body.senderAccountId,
    address: body.address,
    amount: body.amount,
    signatureId: body.signatureId,
    xpub: body.xpub,
  });
  return data;
}

export class WithdrawalService {
  private readonly http: AxiosInstance;

  constructor(options?: { apiKey?: string; baseUrl?: string }) {
    this.http = createTatumHttpClient(options);
  }

  /**
   * Internal: `POST /v3/ledger/transaction`
   * External: `POST /v3/offchain/{ethereum|polygon|bitcoin}/transfer` with KMS `signatureId`
   */
  async executeWithdrawal(req: WithdrawalRequest): Promise<WithdrawalSuccess> {
    const dest = req.destinationAddress.trim();
    if (!dest) {
      throw new Error("destinationAddress is required");
    }

    assertAmount(req.amount);
    const amount = req.amount.trim();

    logger.info("withdrawal.requested", {
      userId: req.userId,
      chain: req.chain,
      amount,
      destinationAddress: dest,
    });

    const sender = await loadSenderWithdrawalContext(req.userId, req.chain);
    if (!sender) {
      throw new Error(
        "sender virtual account or Tatum linkage not found (need wallets + virtual_accounts.tatum_virtual_account_id)"
      );
    }

    const internalRecipient = await findInternalRecipientByAddress(
      req.chain,
      dest
    );

    if (internalRecipient) {
      if (internalRecipient.virtualAccountDbId === sender.virtualAccountDbId) {
        throw new Error("destination is the sender virtual account");
      }

      let reference: string;
      try {
        const out = await postLedgerTransfer(this.http, {
          senderAccountId: sender.tatumVirtualAccountId,
          recipientAccountId: internalRecipient.tatumVirtualAccountId,
          amount,
        });
        reference = out.reference;
      } catch (err) {
        throw wrapAxiosError("ledger transfer failed", err);
      }

      await withTransaction(async (client) => {
        await applyInternalTransferBalances(
          client,
          sender.virtualAccountDbId,
          internalRecipient.virtualAccountDbId,
          amount
        );
        await insertLedgerTransaction(client, {
          virtualAccountDbId: sender.virtualAccountDbId,
          txHash: reference,
          chain: req.chain,
          type: "internal_transfer",
          amount,
          counterpartyAddress: dest,
        });
        await insertLedgerTransaction(client, {
          virtualAccountDbId: internalRecipient.virtualAccountDbId,
          txHash: reference,
          chain: req.chain,
          type: "internal_transfer",
          amount,
          counterpartyAddress: dest,
        });
      });

      logger.info("withdrawal.internal.completed", {
        reference,
        senderVa: sender.tatumVirtualAccountId,
        recipientVa: internalRecipient.tatumVirtualAccountId,
      });

      return {
        mode: "internal_va_transfer",
        reference,
        senderVirtualAccountId: sender.tatumVirtualAccountId,
        recipientVirtualAccountId: internalRecipient.tatumVirtualAccountId,
      };
    }

    const signatureId = resolveKmsSignatureId(req.chain, sender);
    if (!signatureId) {
      throw new Error(
        "KMS signatureId missing: set wallets.tatum_signature_id or TATUM_KMS_SIGNATURE_ID_* env"
      );
    }

    const index = resolveDerivationIndex(sender);

    let raw: unknown;
    try {
      if (req.chain === "ETH" || req.chain === "MATIC") {
        raw = await postExternalEvmTransfer(this.http, req.chain, {
          senderAccountId: sender.tatumVirtualAccountId,
          address: dest,
          amount,
          signatureId,
          index,
        });
      } else {
        raw = await postExternalBtcTransfer(this.http, {
          senderAccountId: sender.tatumVirtualAccountId,
          address: dest,
          amount,
          signatureId,
          xpub: sender.walletXpub,
        });
      }
    } catch (err) {
      throw wrapAxiosError("offchain transfer failed", err);
    }

    const parsed = parseOffchainTransferResponse(raw);

    if (parsed.kind === "pending_kms") {
      simulateKmsSigningLog({
        chain: req.chain,
        withdrawalId: parsed.withdrawalId,
        signatureTemplateId: parsed.signatureTemplateId,
        walletSignatureId: signatureId,
      });
      logger.warn("withdrawal.external.kms_pending", {
        withdrawalId: parsed.withdrawalId,
        signatureTemplateId: parsed.signatureTemplateId,
        message:
          "No DB balance debit until on-chain tx completes; reconcile via webhook or polling",
      });

      return {
        mode: "external_blockchain",
        tatumWithdrawalId: parsed.withdrawalId,
        kmsPending: {
          withdrawalId: parsed.withdrawalId,
          signatureTemplateId: parsed.signatureTemplateId,
        },
      };
    }

    await withTransaction(async (client) => {
      await applyExternalDebitBalance(
        client,
        sender.virtualAccountDbId,
        amount
      );
      await insertLedgerTransaction(client, {
        virtualAccountDbId: sender.virtualAccountDbId,
        txHash: parsed.txId,
        chain: req.chain,
        type: "withdrawal",
        amount,
        counterpartyAddress: dest,
      });
    });

    logger.info("withdrawal.external.completed", {
      txId: parsed.txId,
      withdrawalId: parsed.withdrawalId,
    });

    return {
      mode: "external_blockchain",
      tatumWithdrawalId: parsed.withdrawalId,
      txId: parsed.txId,
    };
  }
}

const sharedWithdrawalService = new WithdrawalService();

export function createWithdrawalService(
  options?: ConstructorParameters<typeof WithdrawalService>[0]
): WithdrawalService {
  if (options) {
    return new WithdrawalService(options);
  }
  return sharedWithdrawalService;
}

export async function requestWithdrawal(
  req: WithdrawalRequest
): Promise<WithdrawalSuccess> {
  return sharedWithdrawalService.executeWithdrawal(req);
}
