import type {
  Chain,
  DepositResponse,
  LoginResponse,
  ProvisionWalletResponse,
  RegisterResponse,
  TransactionsResponse,
  WalletsResponse,
  WithdrawResponse,
} from "../types/api";
import { getApiClient } from "./api";

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await getApiClient().post<LoginResponse>("/auth/login", {
    email,
    password,
  });
  return data;
}

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

export async function fetchWallets(): Promise<WalletsResponse> {
  const { data } = await getApiClient().get<WalletsResponse>("/wallet");
  return data;
}

export async function provisionWallet(
  chain: Chain
): Promise<ProvisionWalletResponse> {
  const { data } = await getApiClient().post<ProvisionWalletResponse>(
    "/wallet",
    { chain }
  );
  return data;
}

export async function createDeposit(chain: Chain): Promise<DepositResponse> {
  const { data } = await getApiClient().post<DepositResponse>("/deposit", {
    chain,
  });
  return data;
}

export async function requestWithdrawal(input: {
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

export async function fetchTransactions(): Promise<TransactionsResponse> {
  const { data } = await getApiClient().get<TransactionsResponse>(
    "/transactions"
  );
  return data;
}
