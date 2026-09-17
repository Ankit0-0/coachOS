import * as Sentry from "@sentry/node";
import type { Application } from "express";

import { env } from "./env.js";
import { REDACTED_KEYS } from "./redaction.js";

/**
 * Error reporting. Sentry sees two kinds of failure, and only those:
 *
 * - an error that escapes a route and reaches Express as a 5xx, through the
 *   handler registered in app.ts;
 * - an error logged at `error`/`fatal` with an `err` attached, which is how a
 *   route records the unexpected failure behind the 500 it sends.
 *
 * Expected failures — a wrong password, a 403, a malformed body — are 4xx and
 * logged at debug or warn, so they never arrive. Without SENTRY_DSN every
 * function here is a no-op.
 */

const CENSOR = "[REDACTED]";
const MAX_DEPTH = 12;

/** Any object tree with every field named in REDACTED_PATHS replaced, at any depth. */
export function scrub<T>(value: T, depth = 0): T {
  if (value === null || typeof value !== "object" || depth > MAX_DEPTH) return value;
  if (Array.isArray(value)) return value.map((item) => scrub(item, depth + 1)) as T;
  const clean: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    clean[key] = REDACTED_KEYS.has(key.toLowerCase()) ? CENSOR : scrub(inner, depth + 1);
  }
  return clean as T;
}

/** A query string (or the query of a URL) with sensitive parameters censored. */
function scrubQuery(query: string): string {
  const params = new URLSearchParams(query);
  for (const key of [...params.keys()]) {
    if (REDACTED_KEYS.has(key.toLowerCase())) params.set(key, CENSOR);
  }
  return params.toString();
}

function scrubUrl(url: string): string {
  const queryStart = url.indexOf("?");
  if (queryStart === -1) return url;
  return `${url.slice(0, queryStart)}?${scrubQuery(url.slice(queryStart + 1))}`;
}

/**
 * `beforeSend`: nothing kept out of the logs reaches Sentry. Request bodies
 * and cookies are dropped outright — a body is where a password or reset code
 * travels, and an email address is PII — and everything else is scrubbed by
 * the shared field list.
 */
export function scrubEvent<E extends Sentry.Event>(event: E): E {
  if (event.request) {
    const { data: _body, cookies: _cookies, ...request } = event.request;
    const clean = scrub(request);
    if (typeof request.url === "string") clean.url = scrubUrl(request.url);
    if (typeof request.query_string === "string") clean.query_string = scrubQuery(request.query_string);
    event.request = clean;
  }
  if (event.extra) event.extra = scrub(event.extra);
  if (event.contexts) event.contexts = scrub(event.contexts);
  if (event.tags) event.tags = scrub(event.tags);
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
      const data = breadcrumb.data ? scrub(breadcrumb.data) : undefined;
      if (data && typeof data.url === "string") data.url = scrubUrl(data.url);
      return data ? { ...breadcrumb, data } : breadcrumb;
    });
  }
  return event;
}

/**
 * Starts Sentry when a DSN is configured; returns whether it did. `overrides`
 * exists for tests, which report to an in-memory transport.
 */
export function initSentry(overrides: Partial<Sentry.NodeOptions> = {}): boolean {
  const dsn = overrides.dsn ?? env.sentryDsn;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: env.nodeEnv,
    release: `coachos-api@${env.appVersion}`,
    sendDefaultPii: false,
    // No tracesSampleRate: tracing is off. The free tier's quota goes fast,
    // and errors are what matter for now.
    beforeSend: (event) => scrubEvent(event),
    ...overrides,
  });
  return true;
}

function statusOf(error: unknown): number | undefined {
  const candidate = error as { status?: unknown; statusCode?: unknown } | null;
  const status = Number(candidate?.status ?? candidate?.statusCode);
  return Number.isInteger(status) ? status : undefined;
}

/**
 * Registered after the routes and before the app's own error handler, which
 * still logs and answers. An error without a status is a genuine throw and
 * counts as a 500; a 4xx is the client's mistake and is left out.
 */
export function registerSentryErrorHandler(app: Application): void {
  if (!Sentry.isInitialized()) return;
  Sentry.setupExpressErrorHandler(app, {
    shouldHandleError: (error) => {
      const status = statusOf(error);
      return status === undefined || status >= 500;
    },
  });
}

/**
 * Called by the logger for every `error`/`fatal` line. Reports the attached
 * error with the request's correlation ids, so an event in Sentry can be found
 * in the logs. Two kinds of line are skipped: ones with no error attached, and
 * pino-http's per-request "HTTP request failed" line, whose error is one it
 * makes up from the status code — the real cause is reported on its own.
 * An error already reported (by the Express handler) is not sent twice; the
 * SDK drops a repeat capture of the same error object.
 */
export function reportLoggedError(args: readonly unknown[], bindings: Record<string, unknown>): void {
  if (!Sentry.isInitialized()) return;

  const [first, second] = args;
  let error: unknown;
  if (first instanceof Error) {
    error = first;
  } else if (first && typeof first === "object" && !("res" in first)) {
    error = (first as { err?: unknown }).err;
  }
  if (!(error instanceof Error)) return;

  Sentry.withScope((scope) => {
    if (typeof bindings.requestId === "string") scope.setTag("requestId", bindings.requestId);
    if (typeof bindings.userId === "string") scope.setTag("userId", bindings.userId);
    if (typeof second === "string") scope.setExtra("logMessage", second);
    Sentry.captureException(error);
  });
}

/** Sends anything still queued before the process exits. Resolves at once without Sentry. */
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!Sentry.isInitialized()) return;
  await Sentry.close(timeoutMs);
}
