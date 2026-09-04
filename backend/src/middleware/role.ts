import type { Request, Response } from "express";
import type { Role } from "@prisma/client";

import { logger } from "../config/logger.js";
import { sendError } from "../utils/http-error.js";

/**
 * Verifies `request.user` (populated by requireAuth, which must run first)
 * matches the given role. Returns the user on success; on failure it has
 * already sent the error response, so callers should `if (!user) return;`.
 */
export function requireRole(request: Request, response: Response, role: Role) {
  const user = request.user;
  if (!user) {
    logger.debug(
      { method: request.method, url: request.originalUrl },
      "requireRole: rejected — no authenticated user on request (requireAuth should have run first)",
    );
    sendError(response, 401);
    return null;
  }
  if (user.role !== role) {
    logger.debug(
      { method: request.method, url: request.originalUrl, userId: user.id, userRole: user.role, requiredRole: role },
      "requireRole: rejected — user role does not match required role",
    );
    sendError(response, 403);
    return null;
  }
  return user;
}
