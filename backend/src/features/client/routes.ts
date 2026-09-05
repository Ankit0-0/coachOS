import { Router, type Request, type Response } from "express";

import { logger } from "../../config/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/role.js";
import { sendError } from "../../utils/http-error.js";
import { checkInsQuerySchema, weightQuerySchema } from "./schemas.js";
import { getClientProfile, listClientCheckIns, listClientWeights } from "./service.js";

export const coachClientRouter: ReturnType<typeof Router> = Router();

coachClientRouter.use(requireAuth);

function respondToClientError(response: Response, request: Request, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (code === "NOT_YOUR_CLIENT") {
    sendError(response, 403);
  } else if (code === "ASSIGNMENT_NOT_FOUND" || code === "CLIENT_NOT_FOUND") {
    sendError(response, 404);
  } else {
    logger.error({ err: error, url: request.originalUrl }, "coach/clients: unexpected error");
    sendError(response, 500);
  }
}

coachClientRouter.get("/:clientId/checkins", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = checkInsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "GET /coach/clients/:clientId/checkins: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Check-ins retrieved successfully.",
      checkIns: await listClientCheckIns(user.id, request.params.clientId, parsed.data),
    });
  } catch (error) {
    respondToClientError(response, request, error);
  }
});

coachClientRouter.get("/:clientId/weight", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = weightQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "GET /coach/clients/:clientId/weight: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Weight entries retrieved successfully.",
      weightEntries: await listClientWeights(user.id, request.params.clientId, parsed.data),
    });
  } catch (error) {
    respondToClientError(response, request, error);
  }
});

coachClientRouter.get("/:clientId/profile", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  try {
    response.json({
      message: "Client profile retrieved successfully.",
      profile: await getClientProfile(user.id, request.params.clientId),
    });
  } catch (error) {
    respondToClientError(response, request, error);
  }
});
