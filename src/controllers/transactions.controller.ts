import type { Request, Response } from "express";
import { getUserTransactionHistory } from "../services/transaction-history.service";

/**
 * `GET /transactions` (authenticated — uses JWT `sub` as user id)
 * Returns `{ transactions: [{ amount, type, status, txHash, ... }] }`.
 */
export async function listUserTransactions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
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
