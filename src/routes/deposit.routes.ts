import { Router } from "express";
import { postDeposit } from "../controllers/deposit.controller";
import { authenticate } from "../middleware/auth.middleware";

export const depositRouter = Router();

depositRouter.use(authenticate);
depositRouter.post("/", postDeposit);
