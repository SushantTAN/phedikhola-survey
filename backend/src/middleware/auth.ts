import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, type TokenPayload } from "../utils/tokens.js";
import { HttpError } from "../utils/http.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return next(
      new HttpError(401, "UNAUTHENTICATED", "Authentication required"),
    );
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(
      new HttpError(401, "INVALID_TOKEN", "Invalid or expired access token"),
    );
  }
}

export const requireRole =
  (...roles: Array<"ADMIN" | "STAFF">) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role))
      return next(new HttpError(403, "FORBIDDEN", "Insufficient permission"));
    next();
  };
