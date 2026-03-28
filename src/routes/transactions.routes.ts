import { Router } from "express";
import { listUserTransactions } from "../controllers/transactions.controller";

export const transactionsRouter = Router();

transactionsRouter.get("/transactions/:userId", listUserTransactions);
