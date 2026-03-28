import type { Chain } from "../types/custody";

const CHAINS: Chain[] = ["ETH", "MATIC", "BTC"];

export function parseChain(raw: unknown): Chain | null {
  if (typeof raw !== "string") {
    return null;
  }
  const u = raw.toUpperCase();
  return CHAINS.includes(u as Chain) ? (u as Chain) : null;
}
