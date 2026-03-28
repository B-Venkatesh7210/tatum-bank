import type { Request, Response } from "express";
import { env } from "../config/env";
import { addDepositAddress } from "../services/custody.service";
import { parseChain } from "../utils/parse-chain";

export async function postDeposit(req: Request, res: Response): Promise<void> {
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
    const out = await addDepositAddress(userId, chain);
    res.status(201).json({ chain, address: out.address });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("POST /wallet")) {
      res.status(404).json({ error: message });
      return;
    }
    res.status(502).json({ error: message });
  }
}
