import { createHmac, timingSafeEqual } from "crypto";
import type { Chain } from "../types/custody";

/**
 * Verifies `x-payload-hash` per Tatum docs (HMAC-SHA512, Base64 digest over raw JSON body).
 * @see https://docs.tatum.io/docs/authenticating-notification-webhooks
 */
export function verifyTatumWebhookHmac(
  rawBodyUtf8: string,
  hmacSecret: string,
  headerHash: string | undefined
): boolean {
  if (!headerHash) {
    return false;
  }
  const digest = createHmac("sha512", hmacSecret)
    .update(rawBodyUtf8, "utf8")
    .digest("base64");
  if (digest.length !== headerHash.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(headerHash));
  } catch {
    return false;
  }
}

export type ExtractedDepositPayload = {
  address: string;
  amount: string;
  /** Present when the webhook includes a chain/network hint Tatum maps to ETH/MATIC/BTC. */
  chain?: Chain;
  txId?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Map Tatum chain / network strings to our ledger chain. */
export function mapTatumChainHint(raw: unknown): Chain | null {
  if (typeof raw !== "string") {
    return null;
  }
  const c = raw.toLowerCase();
  if (
    c.includes("polygon") ||
    c.includes("matic") ||
    c === "matic" ||
    c.includes("polygon-mainnet") ||
    c.includes("polygon-amoy")
  ) {
    return "MATIC";
  }
  if (
    c.includes("ethereum") ||
    c === "eth" ||
    c.includes("sepolia") ||
    c.includes("holesky") ||
    c.includes("hoodi")
  ) {
    return "ETH";
  }
  if (
    c.includes("bitcoin") ||
    c === "btc" ||
    c.includes("bitcoin-testnet")
  ) {
    return "BTC";
  }
  return null;
}

/**
 * Pull deposit fields from common Tatum notification shapes (flat ADDRESS_EVENT, nested `data`, etc.).
 */
export function extractDepositFromPayload(body: unknown): ExtractedDepositPayload | null {
  if (!isRecord(body)) {
    return null;
  }

  let address: string | undefined;
  let amount: string | undefined;
  let chainHint: unknown =
    body.chain ?? body.asset ?? body.network ?? body.currency;
  let txId: string | undefined;

  if (typeof body.address === "string" && body.amount != null) {
    address = body.address;
    amount = String(body.amount);
    txId =
      typeof body.txId === "string"
        ? body.txId
        : typeof body.txHash === "string"
          ? body.txHash
          : typeof body.hash === "string"
            ? body.hash
            : undefined;
  }

  const nested = body.data;
  if ((!address || !amount) && isRecord(nested)) {
    const to = nested.to ?? nested.address;
    const val = nested.value ?? nested.amount;
    if (typeof to === "string" && val != null) {
      address = to;
      amount = String(val);
    }
    chainHint = nested.chain ?? nested.currency ?? chainHint;
    txId =
      typeof nested.txId === "string"
        ? nested.txId
        : typeof nested.txHash === "string"
          ? nested.txHash
          : txId;
  }

  if (!address || amount === undefined) {
    return null;
  }

  const chain = mapTatumChainHint(chainHint);

  return {
    address,
    amount,
    chain: chain ?? undefined,
    txId,
  };
}
