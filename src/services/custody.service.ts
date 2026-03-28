import {
  findVirtualAccountByUserAndChain,
  findWalletByUserAndChain,
  insertAddress,
  insertVirtualAccount,
  listCustodySummaryForUser,
  type CustodySummaryRow,
} from "../repositories/custody.repository";
import type { Chain } from "../types/custody";
import { createVirtualAccountService } from "./virtual-account.service";
import { createWalletService } from "./wallet.service";
import { UserWalletMappingStore } from "./wallet-mapping.store";

/**
 * Creates HD wallet (Tatum), ledger virtual account, and first deposit address when missing.
 */
export async function provisionCustodyForChain(
  userId: string,
  chain: Chain
): Promise<void> {
  const store = new UserWalletMappingStore(userId);
  const walletSvc = createWalletService(store);

  let wallet = await findWalletByUserAndChain(userId, chain);
  if (!wallet) {
    await walletSvc.createWallet(chain);
    wallet = await findWalletByUserAndChain(userId, chain);
    if (!wallet) {
      throw new Error("wallet row missing after Tatum createWallet");
    }
  }

  let va = await findVirtualAccountByUserAndChain(userId, chain);
  const vaApi = createVirtualAccountService();

  if (!va?.tatum_virtual_account_id) {
    const tatumVa = await vaApi.createVirtualAccountForUser({
      userExternalId: userId,
      xpub: wallet.xpub,
      chain,
    });
    const bal = tatumVa.balance?.accountBalance ?? "0";
    await insertVirtualAccount({
      userId,
      chain,
      balance: bal,
      tatumVirtualAccountId: tatumVa.id,
    });
    va = await findVirtualAccountByUserAndChain(userId, chain);
    if (!va?.tatum_virtual_account_id) {
      throw new Error("virtual account row missing after Tatum create");
    }

    const dep = await vaApi.createDepositAddressForVirtualAccount(tatumVa.id);
    await insertAddress({
      virtualAccountId: va.id,
      chain,
      address: dep.address,
      derivationIndex:
        dep.derivationKey !== undefined ? dep.derivationKey : null,
    });
  }
}

export async function addDepositAddress(
  userId: string,
  chain: Chain
): Promise<{ address: string }> {
  const va = await findVirtualAccountByUserAndChain(userId, chain);
  if (!va?.tatum_virtual_account_id) {
    throw new Error(
      "no virtual account for this chain — call POST /wallet first"
    );
  }
  const vaApi = createVirtualAccountService();
  const dep = await vaApi.createDepositAddressForVirtualAccount(
    va.tatum_virtual_account_id
  );
  await insertAddress({
    virtualAccountId: va.id,
    chain,
    address: dep.address,
    derivationIndex:
      dep.derivationKey !== undefined ? dep.derivationKey : null,
  });
  return { address: dep.address };
}

export async function getCustodySummaryForUser(
  userId: string
): Promise<CustodySummaryRow[]> {
  return listCustodySummaryForUser(userId);
}
