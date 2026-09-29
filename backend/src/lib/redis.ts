import Redis from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false
});

export async function ensureRedis() {
  if (redis.status === "wait") {
    try { await redis.connect(); } catch { /* Redis-backed features degrade gracefully in development. */ }
  }
}
