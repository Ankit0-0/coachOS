import { randomUUID } from "node:crypto";

import type { RequestHandler } from "express";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";

import { env } from "./env.js";
import { requestContext } from "./request-context.js";

/** Long enough for a UUID or a trace id, short enough that a client can't stuff the logs. */
const MAX_REQUEST_ID_LENGTH = 200;
export const REQUEST_ID_HEADER = "x-request-id";

/** Liveness polls: Render's, the Docker HEALTHCHECK's, and anything else watching. */
const HEALTH_PATHS = new Set(["/", "/heartbeat"]);

function isHealthCheck(url: string | undefined): boolean {
  return HEALTH_PATHS.has((url ?? "").split("?")[0] ?? "");
}

/**
 * One line per request, carrying a request id that every other line from that
 * request shares.
 *
 * The id comes from an incoming X-Request-Id when there is one, so a proxy's or
 * a client's id is kept rather than replaced, and goes back on the response so
 * a client can quote it.
 */
export function createHttpLogger(baseLogger: Logger): RequestHandler {
  return pinoHttp({
    logger: baseLogger,
    genReqId: (request, response) => {
      const incoming = request.headers[REQUEST_ID_HEADER];
      const supplied = Array.isArray(incoming) ? incoming[0] : incoming;
      const id = supplied?.trim() ? supplied.trim().slice(0, MAX_REQUEST_ID_LENGTH) : randomUUID();
      response.setHeader("X-Request-Id", id);
      return id;
    },
    // Keeps the child logger to the correlation id rather than a copy of the
    // request on every line; the completion line below carries the details.
    quietReqLogger: true,
    customAttributeKeys: { reqId: "requestId", responseTime: "durationMs" },
    customSuccessMessage: () => "HTTP request completed",
    customErrorMessage: () => "HTTP request failed",
    customLogLevel: (request, response, error) => {
      if (error || response.statusCode >= 500) return "error";
      // A client sending a bad request, or being refused one, is worth seeing
      // — including on a health path, where it means the service is unwell.
      if (response.statusCode >= 400) return "warn";
      if (!env.logHealthChecks && isHealthCheck(request.url)) return "silent";
      return "info";
    },
    serializers: {
      req: (request) => ({ method: request.method, url: request.url }),
      res: (response) => ({ statusCode: response.statusCode }),
    },
  });
}

/**
 * Puts the request's logger where code that has no access to `request` can find
 * it (config/logger's getLogger), and adds the fields worth having on every
 * line from this request.
 */
export const attachRequestLogger: RequestHandler = (request, response, next) => {
  request.log = request.log.child({ method: request.method, path: request.path });
  // pino-http writes its completion line through response.log, so both have to
  // point at the same child or that line loses these fields.
  response.log = request.log;
  requestContext.run({ log: request.log }, next);
};
