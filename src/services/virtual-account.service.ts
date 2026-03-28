import axios, { type AxiosInstance } from "axios";
import { env } from "../config/env";
import { getLedgerCurrency } from "../tatum/chain-routing";
import type { Chain } from "../types/custody";

export type TatumCustomerRegistration = {
  externalId: string;
  accountingCurrency?: string;
  customerCountry?: string;
  providerCountry?: string;
};

export type CreateVirtualAccountRequest = {
  userExternalId: string;
  xpub: string;
  chain: Chain;
  /** Merged into `customer` with `externalId` = `userExternalId`. */
  customer?: Omit<TatumCustomerRegistration, "externalId">;
  compliant?: boolean;
  accountCode?: string;
  accountingCurrency?: string;
  accountNumber?: string;
};

/** Response from POST /v3/ledger/account */
export type TatumVirtualAccount = {
  id: string;
  currency: string;
  active: boolean;
  frozen: boolean;
  balance: {
    accountBalance: string;
    availableBalance: string;
  };
  customerId?: string;
  accountNumber?: string;
  accountCode?: string;
  accountingCurrency?: string;
  xpub?: string;
};

/** Response from POST /v3/offchain/account/{id}/address */
export type TatumDepositAddress = {
  address: string;
  currency: string;
  derivationKey?: number;
  xpub?: string;
  destinationTag?: number;
  memo?: string;
  message?: string;
};

/** Response from GET /v3/ledger/account/{id}/balance */
export type TatumVirtualAccountBalance = {
  accountBalance: string;
  availableBalance: string;
};

function assertApiKey(apiKey: string | undefined): asserts apiKey is string {
  if (!apiKey) {
    throw new Error("TATUM_API_KEY is not set");
  }
}

function createHttpClient(apiKey: string, baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
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

function wrapError(context: string, err: unknown): Error {
  return new Error(`${context}: ${extractTatumErrorMessage(err)}`);
}

/**
 * Tatum Virtual Accounts (ledger) — REST v3.
 *
 * - {@link createVirtualAccountForUser} → `POST /v3/ledger/account`
 * - {@link createDepositAddressForVirtualAccount} → `POST /v3/offchain/account/{id}/address`
 * - {@link getVirtualAccountBalance} → `GET /v3/ledger/account/{id}/balance`
 */
export class VirtualAccountService {
  private readonly http: AxiosInstance;

  constructor(options?: { apiKey?: string; baseUrl?: string }) {
    const apiKey = options?.apiKey ?? env.tatumApiKey;
    assertApiKey(apiKey);
    const baseUrl = options?.baseUrl ?? env.tatumApiBaseUrl;
    this.http = createHttpClient(apiKey, baseUrl);
  }

  /**
   * Create a virtual account for a customer and link it to an HD wallet `xpub`.
   * `POST /v3/ledger/account`
   */
  async createVirtualAccountForUser(
    input: CreateVirtualAccountRequest
  ): Promise<TatumVirtualAccount> {
    const currency = getLedgerCurrency(input.chain);
    const body = {
      currency,
      xpub: input.xpub,
      customer: {
        externalId: input.userExternalId,
        ...input.customer,
      },
      ...(input.compliant !== undefined ? { compliant: input.compliant } : {}),
      ...(input.accountCode !== undefined ? { accountCode: input.accountCode } : {}),
      ...(input.accountingCurrency !== undefined
        ? { accountingCurrency: input.accountingCurrency }
        : {}),
      ...(input.accountNumber !== undefined
        ? { accountNumber: input.accountNumber }
        : {}),
    };

    try {
      const { data } = await this.http.post<TatumVirtualAccount>(
        "/v3/ledger/account",
        body
      );
      if (!data?.id) {
        throw new Error("Tatum response missing virtual account id");
      }
      return data;
    } catch (err) {
      throw wrapError("createVirtualAccountForUser failed", err);
    }
  }

  /**
   * Generate the next deposit address for a VA created with `xpub`, or target a derivation `index`.
   * `POST /v3/offchain/account/{id}/address`
   */
  async createDepositAddressForVirtualAccount(
    virtualAccountId: string,
    index?: number
  ): Promise<TatumDepositAddress> {
    if (index !== undefined) {
      if (!Number.isInteger(index) || index < 0) {
        throw new Error("index must be a non-negative integer when provided");
      }
    }

    const path = `/v3/offchain/account/${encodeURIComponent(virtualAccountId)}/address`;
    const config =
      index !== undefined ? { params: { index } } : undefined;

    try {
      const { data } = await this.http.post<TatumDepositAddress>(
        path,
        undefined,
        config
      );
      if (!data?.address) {
        throw new Error("Tatum response missing deposit address");
      }
      return data;
    } catch (err) {
      throw wrapError("createDepositAddressForVirtualAccount failed", err);
    }
  }

  /**
   * Read balances for a virtual account.
   * `GET /v3/ledger/account/{id}/balance`
   */
  async getVirtualAccountBalance(
    virtualAccountId: string
  ): Promise<TatumVirtualAccountBalance> {
    const path = `/v3/ledger/account/${encodeURIComponent(virtualAccountId)}/balance`;

    try {
      const { data } = await this.http.get<TatumVirtualAccountBalance>(path);
      if (
        data?.accountBalance === undefined ||
        data?.availableBalance === undefined
      ) {
        throw new Error("Tatum balance response missing balance fields");
      }
      return data;
    } catch (err) {
      throw wrapError("getVirtualAccountBalance failed", err);
    }
  }
}

const sharedVirtualAccountService = new VirtualAccountService();

export function createVirtualAccountService(
  options?: ConstructorParameters<typeof VirtualAccountService>[0]
): VirtualAccountService {
  if (options) {
    return new VirtualAccountService(options);
  }
  return sharedVirtualAccountService;
}

export async function createVirtualAccountForUser(
  input: CreateVirtualAccountRequest
): Promise<TatumVirtualAccount> {
  return sharedVirtualAccountService.createVirtualAccountForUser(input);
}

/** Alias: assign a new on-chain deposit address to the VA (generated from the VA xpub). */
export async function assignDepositAddressToVirtualAccount(
  virtualAccountId: string,
  index?: number
): Promise<TatumDepositAddress> {
  return sharedVirtualAccountService.createDepositAddressForVirtualAccount(
    virtualAccountId,
    index
  );
}

export async function getVirtualAccountBalance(
  virtualAccountId: string
): Promise<TatumVirtualAccountBalance> {
  return sharedVirtualAccountService.getVirtualAccountBalance(virtualAccountId);
}
