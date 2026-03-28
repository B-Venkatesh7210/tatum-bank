import type { Request, Response } from "express";
import { env } from "../config/env";
import {
  getCustodySummaryForUser,
  provisionCustodyForChain,
} from "../services/custody.service";
import { parseChain } from "../utils/parse-chain";

export async function getWallets(req: Request, res: Response): Promise<void> {
  try {
    if (!env.databaseUrl) {
      res.status(503).json({ error: "DATABASE_URL is not configured" });
      return;
    }
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const summary = await getCustodySummaryForUser(userId);
    res.status(200).json({ wallets: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}

export async function postWallet(req: Request, res: Response): Promise<void> {
  try {
    if (!env.databaseUrl) {
      res.status(503).json({ error: "DATABASE_URL is not configured" });
      return;
    }
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const chain = parseChain(req.body?.chain);
    if (!chain) {
      res.status(400).json({ error: "chain must be ETH, MATIC, or BTC" });
      return;
    }
    await provisionCustodyForChain(userId, chain);
    const summary = await getCustodySummaryForUser(userId);
    const row = summary.find((w) => w.chain === chain);
    res.status(201).json({ chain, wallet: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("unique") || message.includes("duplicate")) {
      res.status(409).json({ error: message });
      return;
    }
    res.status(502).json({ error: message });
  }
}
