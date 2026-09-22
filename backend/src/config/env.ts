import "dotenv/config";
import { createRequire } from "node:module";

/** The running version, for log lines — package.json ships in the image next to src/. */
const packageJson = createRequire(import.meta.url)("../../package.json") as { version?: string };

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

/** An on/off switch from the environment. Anything but "false"/"0" keeps the default on. */
function boolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return !["false", "0", "no", "off"].includes(value.trim().toLowerCase());
}

/** A positive integer from the environment, or the fallback when unset or invalid. */
function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

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
  /**
   * Browser origins allowed through CORS. Accepts a comma-separated list, since
   * production has more than one browser client (the admin website and any
   * Expo web build).
   */
  clientUrls: (process.env.CLIENT_URL ?? "http://localhost:8081")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  /** Unset (or blank) means "info" in production, "debug" anywhere else. */
  logLevel: process.env.LOG_LEVEL?.trim() || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  appVersion: process.env.APP_VERSION ?? packageJson.version ?? "unknown",
  /**
   * Whether a successful poll of / or /heartbeat is logged. On by default while
   * it's worth seeing that the service is alive and being polled; set
   * LOG_HEALTH_CHECKS=false to silence them — Render polls continuously, so
   * that is tens of thousands of lines a month. Failing polls (4xx/5xx) are
   * logged either way.
   */
  logHealthChecks: boolean(process.env.LOG_HEALTH_CHECKS, true),
  /**
   * Upper bound on the pg pool. Kept small because managed Postgres plans cap
   * total connections (Aiven's free tier allows 20): one instance at 5 leaves
   * room for migrations, a second instance during a deploy, and psql sessions.
   */
  dbPoolMax: positiveInt(process.env.DB_POOL_MAX, 5),
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
  /**
   * Optional. Where unexpected errors are reported. Unset — local development,
   * CI, the test suite — Sentry is never initialised and nothing is sent.
   */
  sentryDsn: process.env.SENTRY_DSN?.trim() || undefined,
  /**
   * How many early-access signups one IP may send per ten minutes. The only
   * unauthenticated endpoint, so the only one that needs a limit; raised in the
   * test suite, which makes far more than five requests from one address.
   */
  earlyAccessRateLimitMax: positiveInt(process.env.EARLY_ACCESS_RATE_LIMIT_MAX, 5),
};
