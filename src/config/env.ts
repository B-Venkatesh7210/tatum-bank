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
} as const;
