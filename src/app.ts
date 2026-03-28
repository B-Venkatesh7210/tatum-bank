import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.routes";
import { authRouter } from "./routes/auth.routes";
import { walletRouter } from "./routes/wallet.routes";
import { depositRouter } from "./routes/deposit.routes";
import { withdrawRouter } from "./routes/withdraw.routes";
import { transactionsRouter } from "./routes/transactions.routes";
import { buyRouter } from "./routes/buy.routes";
import { webhookRouter } from "./routes/webhook.routes";

export function createApp(): express.Application {
  const app = express();

  app.use(cors());

  app.use(
    "/webhook",
    express.raw({ type: "application/json" }),
    webhookRouter
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/wallet", walletRouter);
  app.use("/deposit", depositRouter);
  app.use("/withdraw", withdrawRouter);
  app.use("/transactions", transactionsRouter);
  app.use("/buy", buyRouter);

  return app;
}
