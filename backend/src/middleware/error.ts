import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/http.js";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, "NOT_FOUND", `Route ${req.method} ${req.path} not found`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ success: false, code: err.code, message: err.message });
  const prismaError = err as { code?: string; meta?: { target?: unknown; field_name?: unknown } };
  if (prismaError?.code === "P2002") return res.status(409).json({ success: false, code: "DUPLICATE_VALUE", message: `A record with this ${[prismaError.meta?.target].flat().join(", ") || "value"} already exists` });
  if (prismaError?.code === "P2003") return res.status(400).json({ success: false, code: "INVALID_REFERENCE", message: "A referenced record does not exist" });
  console.error(err);
  return res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "An unexpected error occurred" });
}
