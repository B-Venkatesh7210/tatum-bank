import { Bitcoin, Ethereum, Network, Polygon, TatumSDK } from "@tatumio/tatum";
import { env } from "./env";

export type SupportedChain = "ETH" | "MATIC" | "BTC";

export async function getTatumClient(chain: "ETH"): Promise<Ethereum>;
export async function getTatumClient(chain: "MATIC"): Promise<Polygon>;
export async function getTatumClient(chain: "BTC"): Promise<Bitcoin>;
export async function getTatumClient(
  chain: SupportedChain
): Promise<Ethereum | Polygon | Bitcoin> {
  const apiKey = env.tatumApiKey;
  if (!apiKey) {
    throw new Error("TATUM_API_KEY is missing. Set it in your .env file.");
  }

  switch (chain) {
    case "ETH":
      return TatumSDK.init<Ethereum>({
        network: Network.ETHEREUM,
        apiKey,
      });
    case "MATIC":
      return TatumSDK.init<Polygon>({
        network: Network.POLYGON,
        apiKey,
      });
    case "BTC":
      return TatumSDK.init<Bitcoin>({
        network: Network.BITCOIN,
        apiKey,
      });
    default: {
      const exhaustive: never = chain;
      throw new Error(`Unsupported chain: ${String(exhaustive)}`);
    }
  }
}
