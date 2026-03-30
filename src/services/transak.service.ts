import axios from "axios";
import { env } from "../config/env";
import { getTransakHosts } from "../config/transak";
import { getUserDepositAddress } from "../repositories/transak.repository";
import type { Chain } from "../types/custody";
import { logger } from "../utils/logger";

/** Maps custody chain to Transak `network` + `cryptoCurrencyCode` (on-ramp). */
const CHAIN_TO_TRANSAK: Record<
  Chain,
  { network: string; cryptoCurrencyCode: string }
> = {
  ETH: { network: "ethereum", cryptoCurrencyCode: "ETH" },
  MATIC: { network: "polygon", cryptoCurrencyCode: "MATIC" },
  BTC: { network: "bitcoin", cryptoCurrencyCode: "BTC" },
};

type CachedAccessToken = {
  token: string;
  expiresAtMs: number;
};

let cachedToken: CachedAccessToken | null = null;

function assertTransakConfigured(): void {
  const missing: string[] = [];
  if (!env.transakApiKey) missing.push("TRANSAK_API_KEY");
  if (!env.transakApiSecret) missing.push("TRANSAK_API_SECRET");
  if (!env.transakReferrerDomain) missing.push("TRANSAK_REFERRER_DOMAIN");
  if (missing.length > 0) {
    throw new Error(
      `Transak is not configured — set ${missing.join(", ")} in .env (restart the API server after saving)`
    );
  }
}

/**
 * Partner access token (valid ~7 days). Cached in memory; refresh when near expiry.
 * @see https://docs.transak.com/docs/how-to-create-refresh-access-token
 */
export async function getTransakAccessToken(): Promise<string> {
  assertTransakConfigured();
  const now = Date.now();
  if (
    cachedToken &&
    cachedToken.expiresAtMs > now + 120_000
  ) {
    return cachedToken.token;
  }

  const { partnerApiOrigin } = getTransakHosts();
  const url = `${partnerApiOrigin}/partners/api/v2/refresh-token`;

  try {
    const { data } = await axios.post<{
      data?: {
        accessToken?: string;
        expiresAt?: number;
      };
    }>(
      url,
      { apiKey: env.transakApiKey },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "api-secret": env.transakApiSecret,
        },
        timeout: 30_000,
        validateStatus: (s) => s >= 200 && s < 300,
      }
    );

    const accessToken = data?.data?.accessToken;
    if (!accessToken) {
      throw new Error("Transak refresh-token response missing accessToken");
    }

    let expiresAtMs = now + 7 * 24 * 60 * 60 * 1000;
    const exp = data?.data?.expiresAt;
    if (typeof exp === "number") {
      expiresAtMs = exp > 1e12 ? exp : exp * 1000;
    }

    cachedToken = { token: accessToken, expiresAtMs };
    logger.info("transak.access_token.refreshed", { expiresAtMs });
    return accessToken;
  } catch (err) {
    logger.error("transak.refresh_token.failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export type CreateTransakBuyUrlInput = {
  userId: string;
  chain: Chain;
  /** Fiat amount in `transakFiatCurrency` (e.g. USD). */
  fiatAmount: number;
};

export type CreateTransakBuyUrlResult = {
  widgetUrl: string;
  walletAddress: string;
  fiatAmount: number;
  fiatCurrency: string;
  chain: Chain;
};

/**
 * Resolves the user’s deposit address, then creates a one-time Transak widget URL (backend-only).
 * @see https://docs.transak.com/docs/migration-to-api-based-transak-widget-url
 */
export async function createTransakBuyUrl(
  input: CreateTransakBuyUrlInput
): Promise<CreateTransakBuyUrlResult> {
  assertTransakConfigured();

  if (!Number.isFinite(input.fiatAmount) || input.fiatAmount <= 0) {
    throw new Error("fiatAmount must be a positive number");
  }

  const walletAddress = await getUserDepositAddress(input.userId, input.chain);
  if (!walletAddress) {
    throw new Error(
      "no deposit address for user/chain — create a VA address before buying"
    );
  }

  const { network, cryptoCurrencyCode } = CHAIN_TO_TRANSAK[input.chain];
  const accessToken = await getTransakAccessToken();
  const { gatewayOrigin } = getTransakHosts();
  const url = `${gatewayOrigin}/api/v2/auth/session`;

  const body = {
    widgetParams: {
      apiKey: env.transakApiKey,
      referrerDomain: env.transakReferrerDomain,
      walletAddress,
      fiatAmount: input.fiatAmount,
      fiatCurrency: env.transakFiatCurrency,
      cryptoCurrencyCode,
      network,
      productFlow: "ONRAMP",
    },
  };

  try {
    const { data } = await axios.post<{
      data?: { widgetUrl?: string };
    }>(url, body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "access-token": accessToken,
      },
      timeout: 30_000,
      validateStatus: (s) => s >= 200 && s < 300,
    });

    const widgetUrl = data?.data?.widgetUrl;
    if (!widgetUrl) {
      throw new Error("Transak session response missing widgetUrl");
    }

    return {
      widgetUrl,
      walletAddress,
      fiatAmount: input.fiatAmount,
      fiatCurrency: env.transakFiatCurrency,
      chain: input.chain,
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const msg = (err.response?.data as { message?: string } | undefined)?.message;
      logger.error("transak.session.failed", {
        status: err.response?.status,
        message: msg || err.message,
      });
      throw new Error(msg || err.message);
    }
    throw err;
  }
}
