import { Router } from "express";
import { postWithdraw } from "../controllers/withdraw.controller";
import { authenticate } from "../middleware/auth.middleware";

export const withdrawRouter = Router();

withdrawRouter.use(authenticate);
withdrawRouter.post("/", postWithdraw);
