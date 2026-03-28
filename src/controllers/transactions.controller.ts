import type { Request, Response } from "express";
import { getUserTransactionHistory } from "../services/transaction-history.service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * `GET /transactions/:userId`
 * Returns `{ transactions: [{ amount, type, status, txHash, ... }] }`.
 */
export async function listUserTransactions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.params.userId;
    if (typeof userId !== "string" || !UUID_RE.test(userId)) {
      res.status(400).json({ error: "userId must be a valid UUID" });
      return;
    }

    const transactions = await getUserTransactionHistory(userId);
    res.status(200).json({ transactions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_URL")) {
      res.status(503).json({ error: "database not configured" });
      return;
    }
    res.status(500).json({ error: message });
  }
}
