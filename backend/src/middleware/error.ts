import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/http.js";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, "NOT_FOUND", `Route ${req.method} ${req.path} not found`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ success: false, code: err.code, message: err.message });
  console.error(err);
  return res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "An unexpected error occurred" });
}
