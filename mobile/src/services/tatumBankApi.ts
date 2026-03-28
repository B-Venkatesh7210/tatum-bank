/**
 * Legacy names used across screens — implementations live in `api.service.ts`.
 */
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
import {
  buyCrypto,
  getBalances,
  getDepositAddress,
  getTransactions,
  login,
  provisionWallet,
  register,
  withdraw,
} from "./api.service";

export async function fetchWallets(): Promise<WalletsResponse> {
  return getBalances();
}

export { login, register, provisionWallet };

export async function createDeposit(chain: Chain): Promise<DepositResponse> {
  return getDepositAddress(chain);
}

export async function requestWithdrawal(input: {
  chain: Chain;
  amount: string;
  destinationAddress: string;
}): Promise<WithdrawResponse> {
  return withdraw(input);
}

export async function fetchTransactions(): Promise<TransactionsResponse> {
  return getTransactions();
}

export async function fetchBuyUrl(
  chain: Chain,
  fiatAmount?: number
): Promise<BuyUrlResponse> {
  return buyCrypto(chain, fiatAmount);
}
