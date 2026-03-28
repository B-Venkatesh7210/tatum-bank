import { Router } from "express";
import { handleTatumWebhook } from "../controllers/tatum-webhook.controller";

export const tatumWebhookRouter = Router();

tatumWebhookRouter.post("/tatum", handleTatumWebhook);
