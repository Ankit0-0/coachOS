import { Router, type Request, type Response } from "express";

import { logger } from "../../config/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/role.js";
import { sendError } from "../../utils/http-error.js";
import { updateClientProfileSchema, updateCoachProfileSchema } from "./schemas.js";
import {
  getClientProfile,
  getCoachProfile,
  updateClientProfile,
  updateCoachProfile,
} from "./service.js";

export const coachProfileRouter: ReturnType<typeof Router> = Router();
export const clientProfileRouter: ReturnType<typeof Router> = Router();

coachProfileRouter.use(requireAuth);
clientProfileRouter.use(requireAuth);

function respondToProfileError(response: Response, request: Request, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (code === "USER_NOT_FOUND") {
    sendError(response, 404);
  } else {
    logger.error({ err: error, url: request.originalUrl }, "coach/profile: unexpected error");
    sendError(response, 500);
  }
}

coachProfileRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  try {
    response.json({
      message: "Profile retrieved successfully.",
      profile: await getCoachProfile(user.id),
    });
  } catch (error) {
    respondToProfileError(response, request, error);
  }
});

coachProfileRouter.patch("/", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = updateCoachProfileSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "PATCH /coach/profile: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Profile updated successfully.",
      profile: await updateCoachProfile(user.id, parsed.data),
    });
  } catch (error) {
    respondToProfileError(response, request, error);
  }
});

clientProfileRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "CLIENT");
  if (!user) return;

  try {
    response.json({
      message: "Profile retrieved successfully.",
      profile: await getClientProfile(user.id),
    });
  } catch (error) {
    respondToProfileError(response, request, error);
  }
});

clientProfileRouter.patch("/", async (request, response) => {
  const user = requireRole(request, response, "CLIENT");
  if (!user) return;

  const parsed = updateClientProfileSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "PATCH /client/profile: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Profile updated successfully.",
      profile: await updateClientProfile(user.id, parsed.data),
    });
  } catch (error) {
    respondToProfileError(response, request, error);
  }
});
