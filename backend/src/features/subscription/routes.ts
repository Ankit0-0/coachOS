import { Router, type Request, type Response } from "express";

import { logger } from "../../config/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/role.js";
import { sendError } from "../../utils/http-error.js";
import { createSubscriptionSchema, updateSubscriptionSchema } from "./schemas.js";
import {
  createSubscription,
  getClientSubscription,
  listSubscriptions,
  updateSubscription,
} from "./service.js";

export const coachSubscriptionRouter: ReturnType<typeof Router> = Router();
export const clientSubscriptionRouter: ReturnType<typeof Router> = Router();

coachSubscriptionRouter.use(requireAuth);
clientSubscriptionRouter.use(requireAuth);

function respondToSubscriptionError(response: Response, request: Request, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (code === "NOT_YOUR_CLIENT") {
    sendError(response, 403);
  } else if (code === "SUBSCRIPTION_NOT_FOUND") {
    sendError(response, 404);
  } else if (code === "INVALID_DATE_RANGE") {
    sendError(response, 400);
  } else {
    logger.error({ err: error, url: request.originalUrl }, "subscription: unexpected error");
    sendError(response, 500);
  }
}

coachSubscriptionRouter.get("/:clientId/subscriptions", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  try {
    response.json({
      message: "Subscriptions retrieved successfully.",
      subscriptions: await listSubscriptions(user.id, request.params.clientId),
    });
  } catch (error) {
    respondToSubscriptionError(response, request, error);
  }
});

coachSubscriptionRouter.post("/:clientId/subscriptions", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = createSubscriptionSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug(
      { issues: parsed.error.flatten() },
      "POST /coach/clients/:clientId/subscriptions: rejected — invalid request body",
    );
    sendError(response, 400);
    return;
  }

  try {
    response.status(201).json({
      message: "Subscription created successfully.",
      subscription: await createSubscription(user.id, request.params.clientId, {
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        ...(parsed.data.notes === undefined ? {} : { notes: parsed.data.notes }),
      }),
    });
  } catch (error) {
    respondToSubscriptionError(response, request, error);
  }
});

coachSubscriptionRouter.patch("/:clientId/subscriptions/:id", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = updateSubscriptionSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug(
      { issues: parsed.error.flatten() },
      "PATCH /coach/clients/:clientId/subscriptions/:id: rejected — invalid request body",
    );
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Subscription updated successfully.",
      subscription: await updateSubscription(user.id, request.params.clientId, request.params.id, {
        ...(parsed.data.startDate === undefined ? {} : { startDate: parsed.data.startDate }),
        ...(parsed.data.endDate === undefined ? {} : { endDate: parsed.data.endDate }),
        ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
        ...(parsed.data.notes === undefined ? {} : { notes: parsed.data.notes }),
      }),
    });
  } catch (error) {
    respondToSubscriptionError(response, request, error);
  }
});

clientSubscriptionRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "CLIENT");
  if (!user) return;

  try {
    response.json({
      message: "Subscription retrieved successfully.",
      // Null is a valid answer: an open-ended relationship has no record.
      subscription: await getClientSubscription(user.id),
    });
  } catch (error) {
    respondToSubscriptionError(response, request, error);
  }
});
