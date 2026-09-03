import "dotenv/config";

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const env = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  googleClientId: process.env.GOOGLE_CLIENT_ID?.split(",")[0]?.trim(),
  /**
   * Audiences allowed to verify Google id_tokens. Accepts a comma-separated
   * list so native iOS/Android client IDs can be verified alongside the web
   * client ID (each platform mints id_tokens for its own client).
   */
  googleClientAudiences: (process.env.GOOGLE_CLIENT_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:8081",
  logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
};
