import "dotenv/config";

function required(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtAccessSecret: required("JWT_ACCESS_SECRET", "dev-access-change-me"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev-refresh-change-me"),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS ?? 30),
  corsOrigins: (
    process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:8081"
  )
    .split(",")
    .map((v) => v.trim()),
  publicWebUrl: process.env.PUBLIC_WEB_URL ?? "http://localhost:3000",
  smtpHost: process.env.SMTP_HOST ?? "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom:
    process.env.SMTP_FROM ?? "Phedikhola Municipality <noreply@example.com>",
  supabaseUrl: required("SUPABASE_URL", "https://example.supabase.co"),
  supabaseServiceRoleKey: required(
    "SUPABASE_SERVICE_ROLE_KEY",
    "dev-service-role-change-me",
  ),
  supabaseBucket:
    process.env.SUPABASE_STORAGE_BUCKET ?? "phedikhola-citizen-media",
  publicLookupRequireDob: process.env.PUBLIC_LOOKUP_REQUIRE_DOB === "true",
};
