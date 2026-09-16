import type { NextFunction, Request, Response } from "express";

import { getLogger } from "../config/logger.js";
import { requestContext } from "../config/request-context.js";
import { sendError } from "../utils/http-error.js";
import { verifyAccessToken } from "../utils/jwt.js";

export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  const header = request.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    getLogger().warn(
      { method: request.method, url: request.originalUrl, hasAuthHeader: !!header },
      "requireAuth: rejected — no Bearer token in Authorization header",
    );
    sendError(response, 401);
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    request.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
    // From here on, every line from this request says who it was — including
    // the completion line, which pino-http writes through response.log.
    request.log = request.log.child({ userId: payload.sub });
    response.log = request.log;
    const context = requestContext.getStore();
    if (context) context.log = request.log;
    next();
  } catch (error) {
    getLogger().warn(
      {
        method: request.method,
        url: request.originalUrl,
        reason: error instanceof Error ? error.message : String(error),
      },
      "requireAuth: rejected — token failed verification",
    );
    sendError(response, 401);
  }
}
