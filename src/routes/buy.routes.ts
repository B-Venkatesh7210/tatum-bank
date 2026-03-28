import { Router } from "express";
import { getBuyRedirect } from "../controllers/buy.controller";

export const buyRouter = Router();

buyRouter.get("/buy", getBuyRedirect);
