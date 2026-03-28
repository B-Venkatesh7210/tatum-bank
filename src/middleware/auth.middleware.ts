import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

type JwtPayload = {
  sub?: string;
  email?: string;
};

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!env.jwtSecret) {
    res.status(503).json({ error: "JWT_SECRET is not configured" });
    return;
  }

  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing or invalid Authorization header" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    const userId = payload.sub;
    const email = payload.email;
    if (typeof userId !== "string" || typeof email !== "string") {
      res.status(401).json({ error: "invalid token payload" });
      return;
    }
    req.auth = { userId, email };
    next();
  } catch {
    res.status(401).json({ error: "invalid or expired token" });
  }
}
