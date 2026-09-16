import pino from "pino";

import { env } from "./env.js";
import { requestContext } from "./request-context.js";

const isDevelopment = env.nodeEnv === "development";

/**
 * Field paths whose values never belong in a log line, whatever passes them in.
 * A backstop rather than a licence: code still shouldn't log credentials.
 *
 * The bare names catch a field logged at the top level; the `*.` forms catch one
 * nested a level down (`user.password`, `body.token`). `code` is the password
 * reset code — error codes are logged as `reason` so they stay readable.
 */
const REDACTED_PATHS = [
  "password",
  "newPassword",
  "currentPassword",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "idToken",
  "code",
  "codeHash",
  "resetCode",
  "authorization",
  "cookie",
  "secret",
  "jwtSecret",
  "apiKey",
  "resendApiKey",
  "DATABASE_URL",
  "databaseUrl",
  "awsSecretAccessKey",
  "AWS_SECRET_ACCESS_KEY",
  "req.headers.authorization",
  "req.headers.cookie",
  "*.password",
  "*.newPassword",
  "*.passwordHash",
  "*.token",
  "*.accessToken",
  "*.idToken",
  "*.code",
  "*.codeHash",
  "*.authorization",
  "*.secret",
  "*.apiKey",
];

/**
 * Shared by the running logger and by tests, which build a logger over a memory
 * stream from these same options to assert on what actually comes out.
 */
export const loggerOptions: pino.LoggerOptions = {
  level: env.logLevel,
  name: "coachos-api",
  messageKey: "message",
  base: { service: "coachos-api", version: env.appVersion, env: env.nodeEnv },
  // Without this an Error logged as { err } serialises to {} — no message, no stack.
  serializers: { err: pino.stdSerializers.err },
  redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" },
};

export const logger = pino({
  ...loggerOptions,
  ...(isDevelopment
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: true,
            messageKey: "message",
          },
        },
      }
    : {}),
});

/**
 * The logger to write with: the request-scoped child when one is in scope, so
 * the line carries the request id and user id, and the plain instance outside a
 * request (startup, shutdown, scripts).
 */
export function getLogger(): pino.Logger {
  return requestContext.getStore()?.log ?? logger;
}
