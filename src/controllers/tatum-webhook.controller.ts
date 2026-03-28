import type { Request, Response } from "express";
import { env } from "../config/env";
import { applyDepositFromWebhook } from "../services/deposit-webhook.service";
import { logger } from "../utils/logger";
import {
  extractDepositFromPayload,
  verifyTatumWebhookHmac,
} from "../utils/tatum-webhook-verify";

/**
 * `POST /webhook/tatum` — raw JSON body (must not be parsed by `express.json()` before HMAC verification).
 */
export async function handleTatumWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const requestId =
    (req.headers["x-request-id"] as string | undefined) ?? undefined;

  try {
    const raw = req.body;
    if (!Buffer.isBuffer(raw)) {
      logger.warn("tatum webhook: expected Buffer body (use express.raw)", {
        requestId,
      });
      res.status(400).json({ error: "invalid body" });
      return;
    }

    const rawUtf8 = raw.toString("utf8");
    const headerHash = req.headers["x-payload-hash"] as string | undefined;

    if (!env.webhookSkipHmacVerify) {
      if (!env.tatumWebhookHmacSecret) {
        logger.error(
          "tatum webhook: TATUM_WEBHOOK_HMAC_SECRET is not configured",
          { requestId }
        );
        res.status(503).json({ error: "webhook verification not configured" });
        return;
      }
      if (
        !verifyTatumWebhookHmac(
          rawUtf8,
          env.tatumWebhookHmacSecret,
          headerHash
        )
      ) {
        logger.warn("tatum webhook: HMAC verification failed", { requestId });
        res.status(401).json({ error: "invalid signature" });
        return;
      }
    } else {
      logger.warn("tatum webhook: HMAC verification skipped (dev only)", {
        requestId,
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawUtf8) as unknown;
    } catch {
      logger.warn("tatum webhook: JSON parse failed", { requestId });
      res.status(400).json({ error: "invalid json" });
      return;
    }

    const extracted = extractDepositFromPayload(parsed);
    if (!extracted) {
      logger.warn("tatum webhook: unsupported payload shape", {
        requestId,
      });
      res.status(400).json({ error: "could not extract address and amount" });
      return;
    }

    logger.info("tatum webhook: deposit notification received", {
      requestId,
      address: extracted.address,
      chain: extracted.chain,
      hasTxId: Boolean(extracted.txId),
    });

    const result = await applyDepositFromWebhook(extracted);

    if (!result.ok) {
      if (result.error === "virtual account not found") {
        res.status(404).json({ error: result.error });
        return;
      }
      if (result.error === "database not configured") {
        res.status(503).json({ error: result.error });
        return;
      }
      if (result.error === "chain resolution failed") {
        res.status(400).json({ error: result.error });
        return;
      }
      res.status(500).json({ error: result.error });
      return;
    }

    logger.info("tatum webhook: processed", {
      requestId,
      virtualAccountId: result.virtualAccountId,
      credited: result.credited,
      reason: result.reason,
    });

    res.status(200).json({
      ok: true,
      virtualAccountId: result.virtualAccountId,
      credited: result.credited,
      reason: result.reason,
    });
  } catch (err) {
    logger.error("tatum webhook: unhandled error", {
      requestId,
      err: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: "internal error" });
  }
}
