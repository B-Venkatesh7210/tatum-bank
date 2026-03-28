import type { Request, Response } from "express";
import { loginUser, registerUser } from "../services/auth.service";

export async function postRegister(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { email, password } = req.body ?? {};
    const out = await registerUser(email, password);
    res.status(201).json({ userId: out.id, token: out.token });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already registered")) {
      res.status(409).json({ error: message });
      return;
    }
    if (message.includes("DATABASE_URL")) {
      res.status(503).json({ error: message });
      return;
    }
    if (
      message.includes("invalid email") ||
      message.includes("JWT_SECRET")
    ) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: message });
  }
}

export async function postLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body ?? {};
    const out = await loginUser(email, password);
    res.status(200).json({ token: out.token });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("invalid credentials")) {
      res.status(401).json({ error: message });
      return;
    }
    if (message.includes("DATABASE_URL")) {
      res.status(503).json({ error: message });
      return;
    }
    if (message.includes("JWT_SECRET")) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: message });
  }
}
