import type { Request, Response } from "express";
import { env } from "../config/env";
import { requestWithdrawal } from "../services/withdrawal.service";
import { parseChain } from "../utils/parse-chain";
import type { Chain } from "../types/custody";

export async function postWithdraw(req: Request, res: Response): Promise<void> {
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
    const chain = parseChain(req.body?.chain) as Chain | null;
    if (!chain) {
      res.status(400).json({ error: "chain must be ETH, MATIC, or BTC" });
      return;
    }
    const amount =
      typeof req.body?.amount === "string" ? req.body.amount : "";
    const destinationAddress =
      typeof req.body?.destinationAddress === "string"
        ? req.body.destinationAddress
        : "";

    const result = await requestWithdrawal({
      userId,
      chain,
      amount,
      destinationAddress,
    });
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("not found") ||
      message.includes("linkage not found") ||
      message.includes("no virtual account")
    ) {
      res.status(404).json({ error: message });
      return;
    }
    if (message.includes("insufficient")) {
      res.status(400).json({ error: message });
      return;
    }
    if (message.includes("KMS") || message.includes("signatureId")) {
      res.status(503).json({ error: message });
      return;
    }
    res.status(502).json({ error: message });
  }
}
