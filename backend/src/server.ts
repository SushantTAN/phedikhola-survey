import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { ensureRedis, redis } from "./lib/redis.js";

const server = app.listen(env.port, async () => {
  await ensureRedis();
  console.log(`Phedikhola API running on http://localhost:${env.port}/api/v1`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    if (redis.status === "ready") redis.disconnect();
    process.exit(0);
  });
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
