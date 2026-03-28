import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { findUserByEmail, insertUser } from "../repositories/user.repository";

const SALT_ROUNDS = 10;

function assertJwtConfigured(): void {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
}

export async function registerUser(
  email: string,
  password: string
): Promise<{ id: string; token: string }> {
  assertJwtConfigured();
  const e = typeof email === "string" ? email.trim() : "";
  if (!e || typeof password !== "string" || password.length < 8) {
    throw new Error("invalid email or password (password min 8 characters)");
  }

  const existing = await findUserByEmail(e);
  if (existing) {
    throw new Error("email already registered");
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const { id } = await insertUser(e, hash);
  const signOptions: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };
  const token = jwt.sign(
    { sub: id, email: e.toLowerCase() },
    env.jwtSecret,
    signOptions
  );
  return { id, token };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string }> {
  assertJwtConfigured();
  const e = typeof email === "string" ? email.trim() : "";
  if (!e || typeof password !== "string") {
    throw new Error("invalid credentials");
  }

  const user = await findUserByEmail(e);
  if (!user?.password_hash || user.password_hash === "") {
    throw new Error("invalid credentials");
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw new Error("invalid credentials");
  }

  const signOptions: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };
  const token = jwt.sign(
    { sub: user.id, email: user.email },
    env.jwtSecret,
    signOptions
  );
  return { token };
}
