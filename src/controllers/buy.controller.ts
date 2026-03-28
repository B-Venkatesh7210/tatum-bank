import type { Request, Response } from "express";
import { env } from "../config/env";
import { createTransakBuyUrl } from "../services/transak.service";
import type { Chain } from "../types/custody";
import { logger } from "../utils/logger";

const CHAINS: Chain[] = ["ETH", "MATIC", "BTC"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseChain(raw: unknown): Chain | null {
  if (typeof raw !== "string") {
    return null;
  }
  const u = raw.toUpperCase();
  return CHAINS.includes(u as Chain) ? (u as Chain) : null;
}

/**
 * `GET /buy?userId=<uuid>&chain=ETH|MATIC|BTC&fiatAmount=<number>`
 * Returns JSON `{ url }` for redirecting the browser to Transak.
 */
export async function getBuyRedirect(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.query.userId;
    if (typeof userId !== "string" || !UUID_RE.test(userId)) {
      res.status(400).json({ error: "userId must be a valid UUID" });
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
