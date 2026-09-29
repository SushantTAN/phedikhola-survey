import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type TokenPayload = { sub: string; role: "ADMIN" | "STAFF"; email: string };

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.accessTokenTtl as jwt.SignOptions["expiresIn"] });
}

export function signRefreshToken(payload: TokenPayload) {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: `${env.refreshTokenDays}d` });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.jwtAccessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.jwtRefreshSecret) as TokenPayload;
}

export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
export const randomOtp = () => String(Math.floor(100000 + Math.random() * 900000));
