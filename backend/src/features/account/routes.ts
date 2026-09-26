import { Router, type Request, type Response } from "express";

import { getLogger } from "../../config/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { sendError } from "../../utils/http-error.js";
import { deleteAccount, getCurrentUser } from "./service.js";

/** Mounted at /v1/account. */
export const accountRouter: ReturnType<typeof Router> = Router();

accountRouter.use(requireAuth);

/** Deletes the signed-in user's account and all of their data. No body. */
accountRouter.delete("/", async (request: Request, response: Response) => {
  const userId = request.user?.id;
  if (!userId) {
    getLogger().warn({ url: request.originalUrl }, "DELETE /account: rejected — no authenticated user on request");
    sendError(response, 401);
    return;
  }
  try {
    await deleteAccount(userId);
    response.json({ message: "Account deleted." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (code === "USER_NOT_FOUND") {
      sendError(response, 404);
      return;
    }
    if (code === "ADMIN_ACCOUNT") {
      sendError(response, 403);
      return;
    }
    getLogger().error({ err: error }, "DELETE /account: unexpected error");
    sendError(response, 500);
  }
});

/** Mounted at /v1/me: the current user, or 401 if their account no longer exists. */
export const meRouter: ReturnType<typeof Router> = Router();

meRouter.get("/", requireAuth, async (request: Request, response: Response) => {
  const userId = request.user?.id;
  if (!userId) {
    sendError(response, 401);
    return;
  }
  try {
    const user = await getCurrentUser(userId);
    if (!user) {
      getLogger().warn({ userId }, "GET /me: rejected — token is valid but the account no longer exists");
      sendError(response, 401);
      return;
    }
    response.json({ message: "User profile retrieved successfully.", user });
  } catch (error) {
    getLogger().error({ err: error }, "GET /me: unexpected error");
    sendError(response, 500);
  }
});
