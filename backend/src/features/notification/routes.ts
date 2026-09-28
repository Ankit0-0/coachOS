import { Router, type Request, type Response } from "express";

import { getLogger } from "../../config/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { sendError } from "../../utils/http-error.js";
import { registerPushTokenSchema, removePushTokenSchema } from "./schemas.js";
import { registerPushToken, removePushToken } from "./service.js";

/** Mounted at /v1/push-tokens. Any signed-in coach or client. */
export const pushTokenRouter: ReturnType<typeof Router> = Router();

pushTokenRouter.use(requireAuth);

function currentUserId(request: Request, response: Response): string | null {
  const userId = request.user?.id;
  if (!userId) {
    getLogger().warn({ method: request.method, url: request.originalUrl }, "push-tokens: rejected — no authenticated user on request");
    sendError(response, 401);
    return null;
  }
  return userId;
}

pushTokenRouter.post("/", async (request, response) => {
  const userId = currentUserId(request, response);
  if (!userId) return;
  const parsed = registerPushTokenSchema.safeParse(request.body);
  if (!parsed.success) {
    getLogger().debug({ issues: parsed.error.flatten() }, "POST /push-tokens: rejected — invalid request body");
    sendError(response, 400);
    return;
  }
  try {
    await registerPushToken(userId, parsed.data);
    response.status(201).json({ message: "Push token registered." });
  } catch (error) {
    getLogger().error({ err: error }, "POST /push-tokens: unexpected error");
    sendError(response, 500);
  }
});

pushTokenRouter.delete("/", async (request, response) => {
  const userId = currentUserId(request, response);
  if (!userId) return;
  const parsed = removePushTokenSchema.safeParse(request.body);
  if (!parsed.success) {
    getLogger().debug({ issues: parsed.error.flatten() }, "DELETE /push-tokens: rejected — invalid request body");
    sendError(response, 400);
    return;
  }
  try {
    await removePushToken(userId, parsed.data.token);
    response.json({ message: "Push token removed." });
  } catch (error) {
    getLogger().error({ err: error }, "DELETE /push-tokens: unexpected error");
    sendError(response, 500);
  }
});
