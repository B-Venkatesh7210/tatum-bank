export type Chain = "ETH" | "MATIC" | "BTC";

export type LoginResponse = {
  token: string;
};

export type RegisterResponse = {
  userId: string;
  token: string;
};

export type WalletSummary = {
  chain: Chain;
  xpub: string;
  wallet_id: string;
  va_id: string | null;
  va_balance: string | null;
  tatum_virtual_account_id: string | null;
  addresses: string[];
};

export type WalletsResponse = {
  wallets: WalletSummary[];
};

export type ProvisionWalletResponse = {
  chain: Chain;
  wallet: WalletSummary | undefined;
};

export type DepositResponse = {
  chain: Chain;
  address: string;
};

export type WithdrawResponse = Record<string, unknown>;

export type TransactionItem = {
  id: string;
  amount: string;
  type: string;
  status: string;
  txHash: string;
  chain: Chain;
  createdAt: string;
};

export type TransactionsResponse = {
  transactions: TransactionItem[];
};

export type BuyUrlResponse = {
  url: string;
  walletAddress: string;
  fiatAmount: number;
  fiatCurrency: string;
  chain: Chain;
};
