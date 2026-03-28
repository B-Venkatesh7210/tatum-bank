import axios, { type AxiosInstance } from "axios";
import { env } from "./env";

export function assertTatumApiKey(apiKey: string | undefined): asserts apiKey is string {
  if (!apiKey) {
    throw new Error("TATUM_API_KEY is not set");
  }
}

export function createTatumHttpClient(options?: {
  apiKey?: string;
  baseUrl?: string;
}): AxiosInstance {
  const apiKey = options?.apiKey ?? env.tatumApiKey;
  assertTatumApiKey(apiKey);
  const baseUrl = options?.baseUrl ?? env.tatumApiBaseUrl;
  return axios.create({
    baseURL: baseUrl,
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    timeout: 120_000,
    validateStatus: (s) => s >= 200 && s < 300,
  });
}
