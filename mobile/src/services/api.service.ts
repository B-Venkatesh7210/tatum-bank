import axios, { type AxiosInstance } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  BuyUrlResponse,
  Chain,
  DepositResponse,
  LoginResponse,
  ProvisionWalletResponse,
  RegisterResponse,
  TransactionsResponse,
  WalletsResponse,
  WithdrawResponse,
} from "../types/api";

export const TOKEN_STORAGE_KEY = "@tatum_bank_token";

/**
 * API origin. Set `EXPO_PUBLIC_API_URL` (e.g. `http://10.0.2.2:3000` for Android emulator).
 */
export function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3000";
}

let client: AxiosInstance | null = null;

/**
 * Shared Axios instance: JSON, timeout, `Authorization: Bearer <token>` from AsyncStorage.
 */
export function getApiClient(): AxiosInstance {
  if (!client) {
    client = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: 60_000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    client.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }
  return client;
}

export async function setAuthToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_STORAGE_KEY);
}

/** `POST /auth/login` */
export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const { data } = await getApiClient().post<LoginResponse>("/auth/login", {
    email,
    password,
  });
  return data;
}

/** `POST /auth/register` */
export async function register(
  email: string,
  password: string
): Promise<RegisterResponse> {
  const { data } = await getApiClient().post<RegisterResponse>(
    "/auth/register",
    { email, password }
  );
  return data;
}

/** `GET /wallet` — virtual account balances and addresses per chain */
export async function getBalances(): Promise<WalletsResponse> {
  const { data } = await getApiClient().get<WalletsResponse>("/wallet");
  return data;
}

/** `POST /wallet` — create/sync custody wallet + VA for a chain */
export async function provisionWallet(
  chain: Chain
): Promise<ProvisionWalletResponse> {
  const { data } = await getApiClient().post<ProvisionWalletResponse>(
    "/wallet",
    { chain }
  );
  return data;
}

/** `POST /deposit` — generate (or next) deposit address for the chain */
export async function getDepositAddress(
  chain: Chain
): Promise<DepositResponse> {
  const { data } = await getApiClient().post<DepositResponse>("/deposit", {
    chain,
  });
  return data;
}

/** `POST /withdraw` */
export async function withdraw(input: {
  chain: Chain;
  amount: string;
  destinationAddress: string;
}): Promise<WithdrawResponse> {
  const { data } = await getApiClient().post<WithdrawResponse>(
    "/withdraw",
    input
  );
  return data;
}

/** `GET /transactions` */
export async function getTransactions(): Promise<TransactionsResponse> {
  const { data } = await getApiClient().get<TransactionsResponse>(
    "/transactions"
  );
  return data;
}

/** `GET /buy?chain=&fiatAmount=` — Transak widget session (returns `url`, etc.) */
export async function buyCrypto(
  chain: Chain,
  fiatAmount?: number
): Promise<BuyUrlResponse> {
  const params = new URLSearchParams({ chain });
  if (fiatAmount !== undefined && Number.isFinite(fiatAmount)) {
    params.set("fiatAmount", String(fiatAmount));
  }
  const { data } = await getApiClient().get<BuyUrlResponse>(
    `/buy?${params.toString()}`
  );
  return data;
}
