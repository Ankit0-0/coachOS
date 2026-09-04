import { Router, type Request, type Response } from "express";

import { logger } from "../../config/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { sendError } from "../../utils/http-error.js";
import { checkInQuerySchema, checkInSchema, weightQuerySchema, weightSchema } from "./schemas.js";
import {
  listActiveAssignments,
  listCheckIns,
  listWeights,
  upsertCheckIn,
  upsertWeight,
} from "./service.js";

export const trackingRouter: ReturnType<typeof Router> = Router();

function currentUserId(request: Request, response: Response): string | null {
  const userId = request.user?.id;
  if (!userId) {
    logger.debug({ method: request.method, url: request.originalUrl }, "tracking: rejected — no authenticated user on request");
    sendError(response, 401);
    return null;
  }
  return userId;
}

function respondToTrackingError(response: Response, request: Request, error: unknown, notFoundMessage: string, forbiddenMessage: string) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (code === "ASSIGNMENT_NOT_FOUND") {
    logger.debug({ url: request.originalUrl }, `tracking: rejected — ${notFoundMessage}`);
    sendError(response, 404);
  } else if (code === "FORBIDDEN") {
    logger.debug({ url: request.originalUrl, userId: request.user?.id }, `tracking: rejected — ${forbiddenMessage}`);
    sendError(response, 403);
  } else {
    logger.error({ err: error, url: request.originalUrl }, "tracking: unexpected error");
    sendError(response, 500);
  }
}

trackingRouter.use(requireAuth);

trackingRouter.get("/assignments", async (request, response) => {
  const userId = currentUserId(request, response);
  if (!userId) return;
  try {
    response.json({
      message: "Active assignments retrieved successfully.",
      assignments: await listActiveAssignments(userId),
    });
  } catch (error) {
    logger.error({ err: error, url: request.originalUrl }, "tracking: unexpected error");
    sendError(response, 500);
  }
});

trackingRouter.post("/checkin", async (request, response) => {
  const parsed = checkInSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "POST /tracking/checkin: rejected — invalid request body");
    sendError(response, 400);
    return;
  }
  const userId = currentUserId(request, response);
  if (!userId) return;
  try {
    response.json({
      message: "Check-in saved successfully.",
      checkIn: await upsertCheckIn(parsed.data, userId),
    });
  } catch (error) {
    respondToTrackingError(response, request, error, "assignment not found", "check-in does not belong to this client");
  }
});

trackingRouter.get("/checkin", async (request, response) => {
  const parsed = checkInQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "GET /tracking/checkin: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }
  const userId = currentUserId(request, response);
  if (!userId) return;
  try {
    response.json({
      message: "Check-ins retrieved successfully.",
      checkIns: await listCheckIns(parsed.data, userId),
    });
  } catch (error) {
    respondToTrackingError(response, request, error, "assignment not found", "assignment does not belong to this client");
  }
});

trackingRouter.post("/weight", async (request, response) => {
  const parsed = weightSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "POST /tracking/weight: rejected — invalid request body");
    sendError(response, 400);
    return;
  }
  const userId = currentUserId(request, response);
  if (!userId) return;
  try {
    response.json({
      message: "Weight entry saved successfully.",
      weightEntry: await upsertWeight(parsed.data, userId),
    });
  } catch (error) {
    logger.error({ err: error, url: request.originalUrl }, "tracking: unexpected error");
    sendError(response, 500);
  }
});

trackingRouter.get("/weight", async (request, response) => {
  const parsed = weightQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "GET /tracking/weight: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }
  const userId = currentUserId(request, response);
  if (!userId) return;
  try {
    response.json({
      message: "Weight entries retrieved successfully.",
      weightEntries: await listWeights(parsed.data, userId),
    });
  } catch (error) {
    logger.error({ err: error, url: request.originalUrl }, "tracking: unexpected error");
    sendError(response, 500);
  }
});
