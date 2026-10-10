import type { Request, Response } from "express";
import rateLimit, { ipKeyGenerator, type RateLimitRequestHandler } from "express-rate-limit";

import { env } from "../config/env.js";
import { getLogger } from "../config/logger.js";
import { sendError } from "../utils/http-error.js";
import { verifyAccessToken } from "../utils/jwt.js";

const MINUTE_MS = 60 * 1000;

/**
 * A limiter that answers 429 with no body, like every other error. By default
 * keyed on the visitor's address, which `app.set("trust proxy", 1)` in app.ts
 * makes the real one rather than Render's proxy. Each call has its own
 * in-memory store: counts reset on a deploy, which is fine for a backstop.
 */
export function createRateLimit(
  name: string,
  windowMs: number,
  max: number,
  keyGenerator?: (request: Request) => string,
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (request: Request, response: Response) => {
      getLogger().warn({ url: request.originalUrl, limiter: name }, "rateLimit: rejected — limit reached for this caller");
      sendError(response, 429);
    },
  });
}

/**
 * The signed-in user when the request carries a valid token, otherwise the
 * address. Per user so that a misjudged `trust proxy` hop count — every
 * request then appears to come from the proxy — can't put all users in one
 * bucket and lock everyone out together.
 */
function userOrAddressKey(request: Request): string {
  const header = request.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      return `user:${verifyAccessToken(header.slice("Bearer ".length)).sub}`;
    } catch {
      // Invalid or expired: counted by address, and requireAuth will refuse it.
    }
  }
  return `ip:${ipKeyGenerator(request.ip ?? "")}`;
}

/** Every /v1 request. Mounted once in app.ts. */
export function createApiRateLimit(max = env.apiRateLimitMax): RateLimitRequestHandler {
  return createRateLimit("api", MINUTE_MS, max, userOrAddressKey);
}

/** Password, Google and Apple sign-in and sign-up. */
export function createAuthRateLimit(max = env.authRateLimitMax): RateLimitRequestHandler {
  return createRateLimit("auth", 15 * MINUTE_MS, max);
}

/** Forgot and reset password: each accepted request can send an email or test a code. */
export function createPasswordResetRateLimit(max = env.passwordResetRateLimitMax): RateLimitRequestHandler {
  return createRateLimit("password-reset", 15 * MINUTE_MS, max);
}
