import type { NextFunction, Request, Response } from "express";

import { logger } from "../config/logger.js";
import { sendError } from "../utils/http-error.js";
import { verifyAccessToken } from "../utils/jwt.js";

export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  const header = request.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    logger.debug(
      { method: request.method, url: request.originalUrl, hasAuthHeader: !!header },
      "requireAuth: rejected — no Bearer token in Authorization header",
    );
    sendError(response, 401);
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    request.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
    next();
  } catch (error) {
    logger.debug(
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
