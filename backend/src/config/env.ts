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
  /**
   * Optional. Without it, password reset codes are written to the log instead
   * of emailed — fine for local development, but production needs a real key
   * or no one can complete a reset.
   */
  resendApiKey: process.env.RESEND_API_KEY,
  /** Resend's shared sender works without a verified domain of your own. */
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "CoachOS <onboarding@resend.dev>",
  /**
   * Optional, all four together. Image uploads need S3, but local development,
   * CI and the test suite must keep booting without AWS credentials — so these
   * are never `required()`. The upload feature checks them at call time and
   * fails with a clear error instead of taking the whole server down at import.
   */
  awsRegion: process.env.AWS_REGION,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3Bucket: process.env.S3_BUCKET,
};
