import { Router, type Request, type Response } from "express";

import { logger } from "../../config/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/role.js";
import { COACH_NOT_APPROVED_STATUS } from "../../utils/coach-approval.js";
import { sendError } from "../../utils/http-error.js";
import { createCoachRequestSchema, listCoachRequestsQuerySchema } from "./schemas.js";
import {
  acceptCoachRequest,
  cancelCoachRequest,
  createCoachRequest,
  declineCoachRequest,
  getDirectoryCoach,
  listClientRequests,
  listCoachRequests,
  listDirectory,
} from "./service.js";

/** GET /client/coaches — the Explore directory. */
export const clientDirectoryRouter: ReturnType<typeof Router> = Router();
/** /client/coach-requests — a client's requests to be coached. */
export const clientCoachRequestRouter: ReturnType<typeof Router> = Router();
/** /coach/coach-requests — requests a coach has received. */
export const coachCoachRequestRouter: ReturnType<typeof Router> = Router();

clientDirectoryRouter.use(requireAuth);
clientCoachRequestRouter.use(requireAuth);
coachCoachRequestRouter.use(requireAuth);

function respondToExploreError(response: Response, request: Request, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (code === "COACH_NOT_FOUND" || code === "REQUEST_NOT_FOUND" || code === "USER_NOT_FOUND") {
    sendError(response, 404);
  } else if (code === "RELATIONSHIP_EXISTS" || code === "INVALID_STATUS") {
    // Bare 409 either way: the directory already reports the relationship, so
    // the app's answer to a conflict is simply to reload and show the new state.
    logger.debug({ url: request.originalUrl, code }, "explore: rejected — conflicting state");
    sendError(response, 409);
  } else if (code === "COACH_NOT_APPROVED") {
    sendError(response, COACH_NOT_APPROVED_STATUS);
  } else {
    logger.error({ err: error, url: request.originalUrl }, "explore: unexpected error");
    sendError(response, 500);
  }
}

clientDirectoryRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "CLIENT");
  if (!user) return;
  try {
    response.json({ message: "Coaches retrieved successfully.", coaches: await listDirectory(user.id) });
  } catch (error) {
    respondToExploreError(response, request, error);
  }
});

clientDirectoryRouter.get("/:id", async (request, response) => {
  const user = requireRole(request, response, "CLIENT");
  if (!user) return;
  try {
    response.json({
      message: "Coach retrieved successfully.",
      coach: await getDirectoryCoach(user.id, request.params.id),
    });
  } catch (error) {
    respondToExploreError(response, request, error);
  }
});

clientCoachRequestRouter.post("/", async (request, response) => {
  const user = requireRole(request, response, "CLIENT");
  if (!user) return;

  const parsed = createCoachRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "POST /client/coach-requests: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.status(201).json({
      message: "Request sent successfully.",
      request: await createCoachRequest(user.id, parsed.data.coachId, parsed.data.message),
    });
  } catch (error) {
    respondToExploreError(response, request, error);
  }
});

clientCoachRequestRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "CLIENT");
  if (!user) return;

  const parsed = listCoachRequestsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Requests retrieved successfully.",
      requests: await listClientRequests(user.id, parsed.data.status),
    });
  } catch (error) {
    respondToExploreError(response, request, error);
  }
});

clientCoachRequestRouter.post("/:id/cancel", async (request, response) => {
  const user = requireRole(request, response, "CLIENT");
  if (!user) return;
  try {
    response.json({
      message: "Request cancelled successfully.",
      request: await cancelCoachRequest(user.id, request.params.id),
    });
  } catch (error) {
    respondToExploreError(response, request, error);
  }
});

coachCoachRequestRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = listCoachRequestsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Requests retrieved successfully.",
      requests: await listCoachRequests(user.id, parsed.data.status),
    });
  } catch (error) {
    respondToExploreError(response, request, error);
  }
});

coachCoachRequestRouter.post("/:id/accept", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;
  try {
    response.json({
      message: "Request accepted successfully.",
      request: await acceptCoachRequest(user.id, request.params.id),
    });
  } catch (error) {
    respondToExploreError(response, request, error);
  }
});

coachCoachRequestRouter.post("/:id/decline", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;
  try {
    response.json({
      message: "Request declined successfully.",
      request: await declineCoachRequest(user.id, request.params.id),
    });
  } catch (error) {
    respondToExploreError(response, request, error);
  }
});
