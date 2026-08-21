import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../utils/jwt.js";

export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  const header = request.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    response.status(401).json({
      message: "Authentication failed. A Bearer token is required.",
      error: "Bearer token required",
    });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    request.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
    next();
  } catch {
    response.status(401).json({
      message: "Authentication failed. The token is invalid or expired.",
      error: "Invalid or expired token",
    });
  }
}
