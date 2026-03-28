import type { Chain } from "../types/custody";

/** Tatum REST path segment after `/v3/` for blockchain RPC-style routes (wallet, address, …). */
export const TATUM_V3_SEGMENT: Record<Chain, string> = {
  ETH: "ethereum",
  MATIC: "polygon",
  BTC: "bitcoin",
};

/** Native asset codes for ledger / virtual accounts (`CreateAccountXpub`). */
export const LEDGER_CURRENCY: Record<Chain, string> = {
  ETH: "ETH",
  MATIC: "MATIC",
  BTC: "BTC",
};

export function getTatumV3Segment(chain: Chain): string {
  return TATUM_V3_SEGMENT[chain];
}

export function getLedgerCurrency(chain: Chain): string {
  return LEDGER_CURRENCY[chain];
}

/** `GET /v3/{segment}/wallet` */
export function walletEndpoint(chain: Chain): string {
  return `/v3/${TATUM_V3_SEGMENT[chain]}/wallet`;
}

/** `GET /v3/{segment}/address/{xpub}/{index}` */
export function addressFromXpubEndpoint(
  chain: Chain,
  xpub: string,
  index: number
): string {
  return `/v3/${TATUM_V3_SEGMENT[chain]}/address/${encodeURIComponent(xpub)}/${index}`;
}

/**
 * Virtual account → blockchain (off-chain withdrawal / transfer).
 * EVM: KMS `TransferEthKMS`; BTC: `TransferBtcKMS` (requires `xpub` in body).
 */
export function offchainTransferEndpoint(chain: Chain): string {
  switch (chain) {
    case "ETH":
      return "/v3/offchain/ethereum/transfer";
    case "MATIC":
      return "/v3/offchain/polygon/transfer";
    case "BTC":
      return "/v3/offchain/bitcoin/transfer";
    default: {
      const _exhaustive: never = chain;
      throw new Error(`unsupported chain: ${_exhaustive}`);
    }
  }
}

export function isEvmChain(chain: Chain): chain is "ETH" | "MATIC" {
  return chain === "ETH" || chain === "MATIC";
}
