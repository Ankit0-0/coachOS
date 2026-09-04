import { Router, type Request, type Response } from "express";

import { logger } from "../../config/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/role.js";
import { sendError } from "../../utils/http-error.js";
import { createInviteSchema, listInvitesQuerySchema } from "./schemas.js";
import {
  acceptInvite,
  createInvite,
  declineInvite,
  listClientInvites,
  listCoachInvites,
} from "./service.js";

export const coachInviteRouter: ReturnType<typeof Router> = Router();
export const clientInviteRouter: ReturnType<typeof Router> = Router();

function respondToInviteError(response: Response, request: Request, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (code === "INVITE_NOT_FOUND") {
    sendError(response, 404);
  } else if (code === "FORBIDDEN") {
    sendError(response, 403);
  } else if (code === "INVALID_STATUS") {
    sendError(response, 409);
  } else {
    logger.error({ err: error, url: request.originalUrl }, "invite: unexpected error");
    sendError(response, 500);
  }
}

coachInviteRouter.use(requireAuth);
clientInviteRouter.use(requireAuth);

coachInviteRouter.post("/", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = createInviteSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "POST /coach/invites: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.status(201).json({
      message: "Invite sent successfully.",
      invite: await createInvite(user.id, parsed.data.clientEmail),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (code === "INVITE_ALREADY_EXISTS") {
      sendError(response, 409);
    } else {
      logger.error({ err: error, url: request.originalUrl }, "invite: unexpected error");
      sendError(response, 500);
    }
  }
});

coachInviteRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = listInvitesQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "GET /coach/invites: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Invites retrieved successfully.",
      invites: await listCoachInvites(user.id, parsed.data.status),
    });
  } catch (error) {
    logger.error({ err: error, url: request.originalUrl }, "invite: unexpected error");
    sendError(response, 500);
  }
});

clientInviteRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "CLIENT");
  if (!user) return;

  const parsed = listInvitesQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "GET /client/invites: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Invites retrieved successfully.",
      invites: await listClientInvites(user.id, user.email, parsed.data.status),
    });
  } catch (error) {
    logger.error({ err: error, url: request.originalUrl }, "invite: unexpected error");
    sendError(response, 500);
  }
});

clientInviteRouter.post("/:id/accept", async (request, response) => {
  const user = requireRole(request, response, "CLIENT");
  if (!user) return;

  try {
    response.json({
      message: "Invite accepted successfully.",
      invite: await acceptInvite(request.params.id, user.id, user.email),
    });
  } catch (error) {
    respondToInviteError(response, request, error);
  }
});

clientInviteRouter.post("/:id/decline", async (request, response) => {
  const user = requireRole(request, response, "CLIENT");
  if (!user) return;

  try {
    response.json({
      message: "Invite declined successfully.",
      invite: await declineInvite(request.params.id, user.id, user.email),
    });
  } catch (error) {
    respondToInviteError(response, request, error);
  }
});
