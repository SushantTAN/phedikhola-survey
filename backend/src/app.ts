import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error.js";

export const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(
  "/api/v1/auth",
  rateLimit({
    windowMs: 15 * 60_000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.use(
  "/api/v1/public/citizen-lookup",
  rateLimit({
    windowMs: 15 * 60_000,
    limit: 50,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.use("/api/v1", apiRouter);
app.use(notFound);
app.use(errorHandler);
