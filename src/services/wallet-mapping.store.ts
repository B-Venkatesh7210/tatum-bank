import type { WalletMappingStore } from "./wallet.service";
import type { Chain } from "../types/custody";
import {
  findChainForXpub,
  insertWallet,
} from "../repositories/custody.repository";

/**
 * Binds Tatum {@link WalletService} xpub resolution to a single user's DB row.
 */
export class UserWalletMappingStore implements WalletMappingStore {
  constructor(private readonly userId: string) {}

  async saveWallet(xpub: string, chain: Chain): Promise<void> {
    await insertWallet(this.userId, chain, xpub);
  }

  async getChainForXpub(xpub: string): Promise<Chain | undefined> {
    const chain = await findChainForXpub(xpub);
    return chain ?? undefined;
  }

  async saveAddressMapping(_mapping: {
    xpub: string;
    chain: Chain;
    index: number;
    address: string;
  }): Promise<void> {
    // Deposit addresses are created via Virtual Account API, not HD index derivation here.
  }
}
