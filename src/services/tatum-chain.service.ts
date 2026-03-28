import axios from "axios";
import type { AxiosInstance } from "axios";
import { createTatumHttpClient } from "../config/tatum-http";
import {
  addressFromXpubEndpoint,
  isEvmChain,
  offchainTransferEndpoint,
  walletEndpoint,
} from "../tatum/chain-routing";
import type { Chain } from "../types/custody";

export type EvmOffchainTransferParams = {
  senderAccountId: string;
  address: string;
  amount: string;
  signatureId: string;
  index?: number;
};

export type BtcOffchainTransferParams = {
  senderAccountId: string;
  address: string;
  amount: string;
  signatureId: string;
  xpub: string;
  fee?: string;
};

export type TatumChainWalletResponse = {
  mnemonic: string;
  xpub: string;
};

export type TatumChainAddressResponse = {
  address: string;
};

function wrapAxiosError(context: string, err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string } | undefined)?.message;
    return new Error(`${context}: ${msg || err.message}`);
  }
  return err instanceof Error ? err : new Error(`${context}: ${String(err)}`);
}

/**
 * Chain-aware facade over Tatum REST v3: resolves paths and forwards calls.
 */
export class TatumChainService {
  constructor(
    private readonly http: AxiosInstance = createTatumHttpClient()
  ) {}

  /**
   * `GET /v3/{ethereum|polygon|bitcoin}/wallet`
   */
  async generateWallet(chain: Chain): Promise<TatumChainWalletResponse> {
    try {
      const { data } = await this.http.get<TatumChainWalletResponse>(
        walletEndpoint(chain)
      );
      if (!data?.xpub || !data?.mnemonic) {
        throw new Error("wallet response missing xpub or mnemonic");
      }
      return data;
    } catch (err) {
      throw wrapAxiosError(`generateWallet(${chain})`, err);
    }
  }

  /**
   * `GET /v3/{segment}/address/{xpub}/{index}`
   */
  async generateAddressFromXpub(
    chain: Chain,
    xpub: string,
    index: number
  ): Promise<TatumChainAddressResponse> {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error("index must be a non-negative integer");
    }
    try {
      const { data } = await this.http.get<TatumChainAddressResponse>(
        addressFromXpubEndpoint(chain, xpub, index)
      );
      if (!data?.address) {
        throw new Error("address response missing address");
      }
      return data;
    } catch (err) {
      throw wrapAxiosError(`generateAddressFromXpub(${chain})`, err);
    }
  }

  /**
   * Virtual account → blockchain transfer (KMS / off-chain routes).
   * - ETH / MATIC → `POST /v3/offchain/ethereum|polygon/transfer`
   * - BTC → `POST /v3/offchain/bitcoin/transfer`
   */
  async sendTransaction(
    chain: "ETH" | "MATIC",
    params: EvmOffchainTransferParams
  ): Promise<unknown>;
  async sendTransaction(
    chain: "BTC",
    params: BtcOffchainTransferParams
  ): Promise<unknown>;
  async sendTransaction(
    chain: Chain,
    params: EvmOffchainTransferParams | BtcOffchainTransferParams
  ): Promise<unknown> {
    const path = offchainTransferEndpoint(chain);

    if (isEvmChain(chain)) {
      const p = params as EvmOffchainTransferParams;
      try {
        const { data } = await this.http.post(path, {
          senderAccountId: p.senderAccountId,
          address: p.address,
          amount: p.amount,
          signatureId: p.signatureId,
          ...(p.index !== undefined ? { index: p.index } : {}),
        });
        return data;
      } catch (err) {
        throw wrapAxiosError(`sendTransaction(${chain})`, err);
      }
    }

    const p = params as BtcOffchainTransferParams;
    try {
      const { data } = await this.http.post(path, {
        senderAccountId: p.senderAccountId,
        address: p.address,
        amount: p.amount,
        signatureId: p.signatureId,
        xpub: p.xpub,
        ...(p.fee !== undefined ? { fee: p.fee } : {}),
      });
      return data;
    } catch (err) {
      throw wrapAxiosError(`sendTransaction(${chain})`, err);
    }
  }
}

const shared = new TatumChainService();

export function createTatumChainService(
  http?: AxiosInstance
): TatumChainService {
  if (http) {
    return new TatumChainService(http);
  }
  return shared;
}

export async function sendTransaction(
  chain: "ETH" | "MATIC",
  params: EvmOffchainTransferParams
): Promise<unknown>;
export async function sendTransaction(
  chain: "BTC",
  params: BtcOffchainTransferParams
): Promise<unknown>;
export async function sendTransaction(
  chain: Chain,
  params: EvmOffchainTransferParams | BtcOffchainTransferParams
): Promise<unknown> {
  if (chain === "BTC") {
    return shared.sendTransaction(chain, params as BtcOffchainTransferParams);
  }
  return shared.sendTransaction(
    chain as "ETH" | "MATIC",
    params as EvmOffchainTransferParams
  );
}
