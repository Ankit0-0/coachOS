import type { Request, Response } from "express";
import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";

import { env } from "../config/env.js";
import { getLogger } from "../config/logger.js";
import { sendError } from "../utils/http-error.js";

const MINUTE_MS = 60 * 1000;

/**
 * A per-IP limiter that answers 429 with no body, like every other error.
 * Keyed on the visitor's address, which `app.set("trust proxy", 1)` in app.ts
 * makes the real one rather than Render's proxy. Each call has its own
 * in-memory store: counts reset on a deploy, which is fine for a backstop.
 */
export function createRateLimit(name: string, windowMs: number, max: number): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (request: Request, response: Response) => {
      getLogger().warn({ url: request.originalUrl, limiter: name }, "rateLimit: rejected — limit reached for this address");
      sendError(response, 429);
    },
  });
}

/** Every /v1 request. Mounted once in app.ts. */
export function createApiRateLimit(max = env.apiRateLimitMax): RateLimitRequestHandler {
  return createRateLimit("api", MINUTE_MS, max);
}

/** Password, Google and Apple sign-in and sign-up. */
export function createAuthRateLimit(max = env.authRateLimitMax): RateLimitRequestHandler {
  return createRateLimit("auth", 15 * MINUTE_MS, max);
}

/** Forgot and reset password: each accepted request can send an email or test a code. */
export function createPasswordResetRateLimit(max = env.passwordResetRateLimitMax): RateLimitRequestHandler {
  return createRateLimit("password-reset", 15 * MINUTE_MS, max);
}
