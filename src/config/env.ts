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
} as const;
