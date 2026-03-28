import axios, { type AxiosInstance } from "axios";
import { env } from "../config/env";
import type { Chain } from "../types/custody";

const CHAIN_PATH: Record<Chain, string> = {
  ETH: "ethereum",
  MATIC: "polygon",
  BTC: "bitcoin",
};

export type CreateWalletResult = {
  chain: Chain;
  xpub: string;
  mnemonic: string;
};

export type GenerateAddressResult = {
  chain: Chain;
  xpub: string;
  index: number;
  address: string;
};

/** Persists xpub→chain and generated addresses (swap for PostgreSQL in production). */
export interface WalletMappingStore {
  saveWallet(xpub: string, chain: Chain): Promise<void> | void;
  getChainForXpub(xpub: string): Promise<Chain | undefined> | Chain | undefined;
  saveAddressMapping(mapping: {
    xpub: string;
    chain: Chain;
    index: number;
    address: string;
  }): Promise<void> | void;
}

export class InMemoryWalletMappingStore implements WalletMappingStore {
  private readonly chainByXpub = new Map<string, Chain>();

  private readonly addressByKey = new Map<
    string,
    { address: string; chain: Chain }
  >();

  async saveWallet(xpub: string, chain: Chain): Promise<void> {
    this.chainByXpub.set(xpub, chain);
  }

  async getChainForXpub(xpub: string): Promise<Chain | undefined> {
    return this.chainByXpub.get(xpub);
  }

  async saveAddressMapping(mapping: {
    xpub: string;
    chain: Chain;
    index: number;
    address: string;
  }): Promise<void> {
    const key = `${mapping.xpub}:${mapping.index}`;
    this.addressByKey.set(key, {
      address: mapping.address,
      chain: mapping.chain,
    });
  }

  /** For tests / admin: list stored address keys */
  listAddressKeys(): string[] {
    return [...this.addressByKey.keys()];
  }
}

type TatumWalletResponse = {
  mnemonic: string;
  xpub: string;
};

type TatumAddressResponse = {
  address: string;
};

function assertApiKey(apiKey: string | undefined): asserts apiKey is string {
  if (!apiKey) {
    throw new Error("TATUM_API_KEY is not set");
  }
}

function assertNonNegativeIntegerIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error("index must be a non-negative integer");
  }
}

function createHttpClient(apiKey: string, baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
    timeout: 60_000,
    validateStatus: (s) => s >= 200 && s < 300,
  });
}

function extractTatumErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; statusCode?: number }
      | undefined;
    if (data?.message) {
      return data.message;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Wallet helpers backed by Tatum REST API v3 (`api.tatum.io`).
 * @see https://docs.tatum.io/reference/ethgeneratewallet
 * @see https://docs.tatum.io/reference/ethgenerateaddress
 */
export class WalletService {
  private readonly http: AxiosInstance;

  constructor(
    private readonly store: WalletMappingStore,
    options?: { apiKey?: string; baseUrl?: string }
  ) {
    const apiKey = options?.apiKey ?? env.tatumApiKey;
    assertApiKey(apiKey);
    const baseUrl = options?.baseUrl ?? env.tatumApiBaseUrl;
    this.http = createHttpClient(apiKey, baseUrl);
  }

  /**
   * GET /v3/{ethereum|polygon|bitcoin}/wallet — returns mnemonic + xpub (BIP44).
   * Registers xpub→chain so {@link generateAddress} can resolve the REST path.
   */
  async createWallet(chain: Chain): Promise<CreateWalletResult> {
    const segment = CHAIN_PATH[chain];
    try {
      const { data } = await this.http.get<TatumWalletResponse>(
        `/v3/${segment}/wallet`
      );

      if (!data?.xpub || !data?.mnemonic) {
        throw new Error("Tatum wallet response missing xpub or mnemonic");
      }

      await this.store.saveWallet(data.xpub, chain);

      return {
        chain,
        xpub: data.xpub,
        mnemonic: data.mnemonic,
      };
    } catch (err) {
      throw new Error(`Tatum createWallet failed: ${extractTatumErrorMessage(err)}`);
    }
  }

  /**
   * GET /v3/{chain}/address/{xpub}/{index}
   * Requires `xpub` to have been registered via {@link createWallet} (same process / store).
   */
  async generateAddress(xpub: string, index: number): Promise<GenerateAddressResult> {
    assertNonNegativeIntegerIndex(index);

    const chain = await this.store.getChainForXpub(xpub);
    if (!chain) {
      throw new Error(
        "Unknown xpub: call createWallet(chain) first so the chain can be resolved for this xpub"
      );
    }

    const segment = CHAIN_PATH[chain];
    const path = `/v3/${segment}/address/${encodeURIComponent(xpub)}/${index}`;

    try {
      const { data } = await this.http.get<TatumAddressResponse>(path);

      if (!data?.address) {
        throw new Error("Tatum address response missing address");
      }

      await this.store.saveAddressMapping({
        xpub,
        chain,
        index,
        address: data.address,
      });

      return {
        chain,
        xpub,
        index,
        address: data.address,
      };
    } catch (err) {
      throw new Error(
        `Tatum generateAddress failed: ${extractTatumErrorMessage(err)}`
      );
    }
  }
}

const sharedMappingStore = new InMemoryWalletMappingStore();
const sharedWalletService = new WalletService(sharedMappingStore);

/**
 * @param store - Optional custom store (e.g. PostgreSQL). If omitted, a process-wide
 *   in-memory store is used so {@link createWallet} / {@link generateAddress} share state.
 */
export function createWalletService(store?: WalletMappingStore): WalletService {
  if (store) {
    return new WalletService(store);
  }
  return sharedWalletService;
}

export async function createWallet(chain: Chain): Promise<CreateWalletResult> {
  return sharedWalletService.createWallet(chain);
}

export async function generateAddress(
  xpub: string,
  index: number
): Promise<GenerateAddressResult> {
  return sharedWalletService.generateAddress(xpub, index);
}
