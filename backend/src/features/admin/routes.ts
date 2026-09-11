import { Router, type Request, type Response } from "express";

import { logger } from "../../config/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/role.js";
import { sendError } from "../../utils/http-error.js";
import {
  createDefaultPlanSchema,
  listCoachesQuerySchema,
  listDefaultPlansQuerySchema,
  updateDefaultPlanSchema,
} from "./schemas.js";
import {
  createDefaultPlan,
  deleteDefaultPlan,
  getCoach,
  getDefaultPlan,
  listCoaches,
  listDefaultPlans,
  setCoachApproval,
  updateDefaultPlan,
} from "./service.js";

export const adminCoachRouter: ReturnType<typeof Router> = Router();
export const adminPlanRouter: ReturnType<typeof Router> = Router();

function respondToAdminError(response: Response, request: Request, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (code === "COACH_NOT_FOUND" || code === "PLAN_NOT_FOUND") {
    sendError(response, 404);
  } else if (code === "PLAN_IN_USE") {
    sendError(response, 409);
  } else if (code === "CONTENT_TYPE_MISMATCH") {
    sendError(response, 400);
  } else {
    logger.error({ err: error, url: request.originalUrl }, "admin: unexpected error");
    sendError(response, 500);
  }
}

adminCoachRouter.use(requireAuth);
adminPlanRouter.use(requireAuth);

// ---------------------------------------------------------------------------
// Coaches
// ---------------------------------------------------------------------------

adminCoachRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  const parsed = listCoachesQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "GET /admin/coaches: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Coaches retrieved successfully.",
      coaches: await listCoaches(parsed.data.status),
    });
  } catch (error) {
    respondToAdminError(response, request, error);
  }
});

adminCoachRouter.get("/:id", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  try {
    response.json({
      message: "Coach retrieved successfully.",
      coach: await getCoach(request.params.id),
    });
  } catch (error) {
    respondToAdminError(response, request, error);
  }
});

adminCoachRouter.post("/:id/approve", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  try {
    response.json({
      message: "Coach approved successfully.",
      coach: await setCoachApproval(request.params.id, "APPROVED"),
    });
  } catch (error) {
    respondToAdminError(response, request, error);
  }
});

adminCoachRouter.post("/:id/reject", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  try {
    response.json({
      message: "Coach rejected successfully.",
      coach: await setCoachApproval(request.params.id, "REJECTED"),
    });
  } catch (error) {
    respondToAdminError(response, request, error);
  }
});

// ---------------------------------------------------------------------------
// Default (shared library) plans
// ---------------------------------------------------------------------------

adminPlanRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  const parsed = listDefaultPlansQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "GET /admin/plans: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Default plans retrieved successfully.",
      plans: await listDefaultPlans(parsed.data.type),
    });
  } catch (error) {
    respondToAdminError(response, request, error);
  }
});

adminPlanRouter.get("/:id", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  try {
    response.json({
      message: "Default plan retrieved successfully.",
      plan: await getDefaultPlan(request.params.id),
    });
  } catch (error) {
    respondToAdminError(response, request, error);
  }
});

adminPlanRouter.post("/", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  const parsed = createDefaultPlanSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "POST /admin/plans: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.status(201).json({
      message: "Default plan created successfully.",
      plan: await createDefaultPlan({
        type: parsed.data.type,
        title: parsed.data.title,
        ...(parsed.data.description === undefined ? {} : { description: parsed.data.description }),
        content: parsed.data.content,
      }),
    });
  } catch (error) {
    respondToAdminError(response, request, error);
  }
});

adminPlanRouter.patch("/:id", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  const parsed = updateDefaultPlanSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "PATCH /admin/plans/:id: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Default plan updated successfully.",
      plan: await updateDefaultPlan(request.params.id, {
        ...(parsed.data.title === undefined ? {} : { title: parsed.data.title }),
        ...(parsed.data.description === undefined ? {} : { description: parsed.data.description }),
        ...(parsed.data.content === undefined ? {} : { content: parsed.data.content }),
      }),
    });
  } catch (error) {
    respondToAdminError(response, request, error);
  }
});

adminPlanRouter.delete("/:id", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  try {
    await deleteDefaultPlan(request.params.id);
    response.status(204).end();
  } catch (error) {
    respondToAdminError(response, request, error);
  }
});
