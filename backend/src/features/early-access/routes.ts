import { Router, type Request, type Response } from "express";
import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";

import { env } from "../../config/env.js";
import { getLogger } from "../../config/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/role.js";
import { sendError } from "../../utils/http-error.js";
import { earlyAccessSignupSchema } from "./schemas.js";
import { listEarlyAccessSignups, recordEarlyAccessSignup } from "./service.js";

export const earlyAccessRouter: ReturnType<typeof Router> = Router();
export const adminEarlyAccessRouter: ReturnType<typeof Router> = Router();

/** Ten minutes: long enough that a bot gets bored, short enough to forgive a typo. */
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Per-IP limit for the one endpoint that anyone on the internet can reach.
 * Scoped to this router on purpose: the authenticated routes are unchanged.
 * `app.set("trust proxy", 1)` in app.ts is what makes the key the visitor's
 * address rather than Render's proxy — without it one visitor's limit would
 * lock out everyone.
 */
export function createEarlyAccessRateLimit(max = env.earlyAccessRateLimitMax): RateLimitRequestHandler {
  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (request: Request, response: Response) => {
      getLogger().warn({ url: request.originalUrl }, "earlyAccess: rejected — rate limit reached for this address");
      sendError(response, 429);
    },
  });
}

// No requireAuth: this is the public endpoint the landing page posts to.
earlyAccessRouter.post("/", createEarlyAccessRateLimit(), async (request: Request, response: Response) => {
  const parsed = earlyAccessSignupSchema.safeParse(request.body);
  if (!parsed.success) {
    getLogger().debug({ issues: parsed.error.flatten() }, "POST /early-access: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    await recordEarlyAccessSignup(parsed.data);
    // 201 either way — a repeat signup must be indistinguishable from a first one.
    response.status(201).json({ message: "You're on the early access list.", success: true });
  } catch (error) {
    getLogger().error({ err: error }, "POST /early-access: unexpected error");
    sendError(response, 500);
  }
});

adminEarlyAccessRouter.use(requireAuth);

adminEarlyAccessRouter.get("/", async (request: Request, response: Response) => {
  const admin = requireRole(request, response, "ADMIN");
  if (!admin) return;

  try {
    response.json({ message: "Early access signups retrieved successfully.", ...(await listEarlyAccessSignups()) });
  } catch (error) {
    getLogger().error({ err: error }, "GET /admin/early-access: unexpected error");
    sendError(response, 500);
  }
});
