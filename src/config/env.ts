import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const trimTrailingSlash = (url: string) => url.replace(/\/$/, "");

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT) || 3000,
  tatumApiKey: process.env.TATUM_API_KEY ?? "",
  tatumApiBaseUrl: process.env.TATUM_API_BASE_URL
    ? trimTrailingSlash(process.env.TATUM_API_BASE_URL)
    : "https://api.tatum.io",
  /** PostgreSQL connection string (required for webhook balance updates). */
  databaseUrl: process.env.DATABASE_URL ?? "",
  /**
   * Same secret as configured via Tatum `PUT /v4/subscription` HMAC enablement.
   * Used to verify `x-payload-hash` on incoming webhooks.
   */
  tatumWebhookHmacSecret: process.env.TATUM_WEBHOOK_HMAC_SECRET ?? "",
  /**
   * If `true`, skip HMAC verification (development only — never enable in production).
   */
  webhookSkipHmacVerify:
    process.env.WEBHOOK_SKIP_HMAC_VERIFY === "true" &&
    process.env.NODE_ENV !== "production",
  /**
   * Default Tatum KMS wallet signature IDs (UUID) per chain when `wallets.tatum_signature_id` is null.
   * @see https://github.com/tatumio/tatum-kms
   */
  tatumKmsSignatureIdEth: process.env.TATUM_KMS_SIGNATURE_ID_ETH ?? "",
  tatumKmsSignatureIdMatic: process.env.TATUM_KMS_SIGNATURE_ID_MATIC ?? "",
  tatumKmsSignatureIdBtc: process.env.TATUM_KMS_SIGNATURE_ID_BTC ?? "",
  tatumKmsDerivationIndex: (() => {
    const n = Number(process.env.TATUM_KMS_DERIVATION_INDEX ?? "0");
    return Number.isFinite(n) ? n : 0;
  })(),
  /** Log KMS pending-template details (no on-chain effect). */
  tatumKmsSimulateLogging:
    process.env.TATUM_KMS_SIMULATE_LOGGING === "true",

  /** Transak (fiat on-ramp) — use staging keys until production approval */
  transakUseStaging: process.env.TRANSAK_USE_STAGING !== "false",
  transakApiKey: (process.env.TRANSAK_API_KEY ?? "").trim(),
  transakApiSecret: (process.env.TRANSAK_API_SECRET ?? "").trim(),
  /** Hostname only, e.g. `app.example.com` or `localhost:5173` (no protocol) */
  transakReferrerDomain: (process.env.TRANSAK_REFERRER_DOMAIN ?? "").trim(),
  transakDefaultFiatAmount: (() => {
    const n = Number(process.env.TRANSAK_DEFAULT_FIAT_AMOUNT ?? "100");
    return Number.isFinite(n) && n > 0 ? n : 100;
  })(),
  transakFiatCurrency: process.env.TRANSAK_FIAT_CURRENCY ?? "USD",

  /** HS256 secret for JWT access tokens (required when using /auth). */
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
} as const;
