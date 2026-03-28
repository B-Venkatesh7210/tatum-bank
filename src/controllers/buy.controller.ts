import type { Request, Response } from "express";
import { env } from "../config/env";
import { createTransakBuyUrl } from "../services/transak.service";
import { logger } from "../utils/logger";
import { parseChain } from "../utils/parse-chain";

/**
 * `GET /buy?chain=ETH|MATIC|BTC&fiatAmount=<number>` (authenticated)
 * Returns JSON `{ url, walletAddress, ... }` for redirecting the browser to Transak.
 */
export async function getBuyRedirect(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const chain = parseChain(req.query.chain);
    if (!chain) {
      res.status(400).json({ error: "chain must be ETH, MATIC, or BTC" });
      return;
    }

    let fiatAmount = env.transakDefaultFiatAmount;
    const fa = req.query.fiatAmount;
    if (fa !== undefined) {
      const n = Number(fa);
      if (!Number.isFinite(n) || n <= 0) {
        res.status(400).json({ error: "fiatAmount must be a positive number" });
        return;
      }
      fiatAmount = n;
    }

    if (!env.databaseUrl) {
      res.status(503).json({ error: "DATABASE_URL is not configured" });
      return;
    }

    const result = await createTransakBuyUrl({
      userId,
      chain,
      fiatAmount,
    });

    logger.info("buy.transak.url_created", {
      userId,
      chain,
      fiatAmount: result.fiatAmount,
    });

    res.status(200).json({
      url: result.widgetUrl,
      walletAddress: result.walletAddress,
      fiatAmount: result.fiatAmount,
      fiatCurrency: result.fiatCurrency,
      chain: result.chain,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("not configured") ||
      message.includes("Transak is not configured")
    ) {
      res.status(503).json({ error: "Transak is not configured" });
      return;
    }
    if (message.includes("no deposit address")) {
      res.status(404).json({ error: message });
      return;
    }
    logger.error("buy.transak.failed", { message });
    res.status(502).json({ error: message });
  }
}
