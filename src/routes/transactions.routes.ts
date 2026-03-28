import { Router } from "express";
import { listUserTransactions } from "../controllers/transactions.controller";
import { authenticate } from "../middleware/auth.middleware";

export const transactionsRouter = Router();

transactionsRouter.use(authenticate);
transactionsRouter.get("/", listUserTransactions);
