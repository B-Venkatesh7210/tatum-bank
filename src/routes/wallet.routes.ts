import { Router } from "express";
import { getWallets, postWallet } from "../controllers/wallet.controller";
import { authenticate } from "../middleware/auth.middleware";

export const walletRouter = Router();

walletRouter.use(authenticate);
walletRouter.get("/", getWallets);
walletRouter.post("/", postWallet);
