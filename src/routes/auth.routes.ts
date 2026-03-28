import { Router } from "express";
import { postLogin, postRegister } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/register", postRegister);
authRouter.post("/login", postLogin);
