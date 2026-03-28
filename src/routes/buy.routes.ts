import { Router } from "express";
import { getBuyRedirect } from "../controllers/buy.controller";
import { authenticate } from "../middleware/auth.middleware";

export const buyRouter = Router();

buyRouter.use(authenticate);
buyRouter.get("/", getBuyRedirect);
