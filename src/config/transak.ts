import { env } from "./env";

export type TransakHosts = {
  partnerApiOrigin: string;
  gatewayOrigin: string;
};

/** Partner API (refresh token) + API gateway (widget session) hostnames. */
export function getTransakHosts(): TransakHosts {
  const staging = env.transakUseStaging;
  return {
    partnerApiOrigin: staging
      ? "https://api-stg.transak.com"
      : "https://api.transak.com",
    gatewayOrigin: staging
      ? "https://api-gateway-stg.transak.com"
      : "https://api-gateway.transak.com",
  };
}
