import { Router } from "express";
import { handleTatumWebhook } from "../controllers/tatum-webhook.controller";

export const webhookRouter = Router();

webhookRouter.post("/tatum", handleTatumWebhook);
