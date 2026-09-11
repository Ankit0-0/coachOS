import { Router, type Request, type Response } from "express";

import { logger } from "../../config/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/role.js";
import { COACH_NOT_APPROVED_STATUS } from "../../utils/coach-approval.js";
import { sendError } from "../../utils/http-error.js";
import {
  createAssignmentSchema,
  createPlanSchema,
  listAssignmentsQuerySchema,
  listPlansQuerySchema,
  updatePlanSchema,
} from "./schemas.js";
import {
  createAssignment,
  createPlan,
  deletePlan,
  getPlan,
  listClientAssignments,
  listCoachPlans,
  updatePlan,
} from "./service.js";

export const coachPlanRouter: ReturnType<typeof Router> = Router();
export const coachAssignmentRouter: ReturnType<typeof Router> = Router();

coachPlanRouter.use(requireAuth);
coachAssignmentRouter.use(requireAuth);

function respondToPlanError(response: Response, request: Request, error: unknown, logMessage: string) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (code === "COACH_NOT_APPROVED") {
    sendError(response, COACH_NOT_APPROVED_STATUS);
  } else if (code === "PLAN_NOT_FOUND") {
    sendError(response, 404);
  } else if (code === "FORBIDDEN") {
    sendError(response, 403);
  } else if (code === "PLAN_LIMIT_REACHED" || code === "PLAN_IN_USE") {
    sendError(response, 409);
  } else if (code === "CONTENT_TYPE_MISMATCH") {
    sendError(response, 400);
  } else {
    logger.error({ err: error, url: request.originalUrl }, logMessage);
    sendError(response, 500);
  }
}

function respondToAssignmentError(response: Response, request: Request, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (code === "COACH_NOT_APPROVED") {
    sendError(response, COACH_NOT_APPROVED_STATUS);
  } else if (code === "NOT_YOUR_CLIENT") {
    sendError(response, 403);
  } else if (code === "PLAN_NOT_FOUND") {
    sendError(response, 404);
  } else {
    logger.error({ err: error, url: request.originalUrl }, "assignment: unexpected error");
    sendError(response, 500);
  }
}

coachPlanRouter.post("/", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = createPlanSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "POST /coach/plans: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.status(201).json({
      message: "Plan created successfully.",
      plan: await createPlan(user.id, parsed.data),
    });
  } catch (error) {
    respondToPlanError(response, request, error, "plan: unexpected error creating plan");
  }
});

coachPlanRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = listPlansQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "GET /coach/plans: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Plans retrieved successfully.",
      ...(await listCoachPlans(user.id, parsed.data.type)),
    });
  } catch (error) {
    logger.error({ err: error, url: request.originalUrl }, "plan: unexpected error listing plans");
    sendError(response, 500);
  }
});

coachPlanRouter.get("/:id", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  try {
    response.json({
      message: "Plan retrieved successfully.",
      plan: await getPlan(user.id, request.params.id),
    });
  } catch (error) {
    respondToPlanError(response, request, error, "plan: unexpected error retrieving plan");
  }
});

coachPlanRouter.patch("/:id", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = updatePlanSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "PATCH /coach/plans/:id: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Plan updated successfully.",
      plan: await updatePlan(user.id, request.params.id, parsed.data),
    });
  } catch (error) {
    respondToPlanError(response, request, error, "plan: unexpected error updating plan");
  }
});

coachPlanRouter.delete("/:id", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  try {
    await deletePlan(user.id, request.params.id);
    response.status(204).end();
  } catch (error) {
    respondToPlanError(response, request, error, "plan: unexpected error deleting plan");
  }
});

coachAssignmentRouter.post("/", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = createAssignmentSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "POST /coach/assignments: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.status(201).json({
      message: "Plan assigned successfully.",
      assignment: await createAssignment(user.id, parsed.data),
    });
  } catch (error) {
    respondToAssignmentError(response, request, error);
  }
});

coachAssignmentRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = listAssignmentsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "GET /coach/assignments: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Assignments retrieved successfully.",
      assignments: await listClientAssignments(user.id, parsed.data.clientId),
    });
  } catch (error) {
    respondToAssignmentError(response, request, error);
  }
});
