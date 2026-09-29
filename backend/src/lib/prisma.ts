import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

const adapter = new PrismaPg({ connectionString: env.databaseUrl, max: Number(process.env.DB_POOL_MAX ?? (process.env.VERCEL ? 1 : 10)) });
export const prisma = new PrismaClient({ adapter });
