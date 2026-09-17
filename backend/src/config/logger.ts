import pino from "pino";

import { env } from "./env.js";
import { REDACTED_PATHS } from "./redaction.js";
import { requestContext } from "./request-context.js";
import { reportLoggedError } from "./sentry.js";

const isDevelopment = env.nodeEnv === "development";


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
  hooks: {
    // An error-level line is, by this codebase's convention, something
    // unexpected — the same line that precedes a 500. Those go to Sentry too.
    logMethod(args, method, level) {
      if (level >= pino.levels.values.error!) reportLoggedError(args, this.bindings());
      method.apply(this, args);
    },
  },
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
