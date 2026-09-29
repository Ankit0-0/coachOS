import { Router, type Request, type Response } from "express";

import { getLogger } from "../../config/logger.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/role.js";
import { COACH_NOT_APPROVED_STATUS } from "../../utils/coach-approval.js";
import { sendError } from "../../utils/http-error.js";
import {
  adminCreateDietItemSchema,
  adminCreateExerciseSchema,
  adminDietItemQuerySchema,
  adminExerciseQuerySchema,
  adminUpdateDietItemSchema,
  adminUpdateExerciseSchema,
  coachCreateDietItemSchema,
  coachCreateExerciseSchema,
  dietItemQuerySchema,
  exerciseQuerySchema,
} from "./schemas.js";
import {
  createCoachDietItem,
  createCoachExercise,
  createGlobalDietItem,
  createGlobalExercise,
  deleteGlobalDietItem,
  deleteGlobalExercise,
  getGlobalDietItem,
  getGlobalExercise,
  listCoachDietItems,
  listCoachExercises,
  listGlobalDietItems,
  listGlobalExercises,
  updateGlobalDietItem,
  updateGlobalExercise,
} from "./service.js";

/** GET/POST /coach/exercises — global entries plus the caller's own. */
export const coachExerciseRouter: ReturnType<typeof Router> = Router();
/** GET/POST /coach/diet-items */
export const coachDietItemRouter: ReturnType<typeof Router> = Router();
/** Full management of global exercises. A coach's own entry is a 404 here. */
export const adminExerciseRouter: ReturnType<typeof Router> = Router();
/** Full management of global diet items. */
export const adminDietItemRouter: ReturnType<typeof Router> = Router();

coachExerciseRouter.use(requireAuth);
coachDietItemRouter.use(requireAuth);
adminExerciseRouter.use(requireAuth);
adminDietItemRouter.use(requireAuth);

function respondToLibraryError(response: Response, request: Request, error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (code === "COACH_NOT_APPROVED") {
    sendError(response, COACH_NOT_APPROVED_STATUS);
  } else if (code === "EXERCISE_NOT_FOUND" || code === "DIET_ITEM_NOT_FOUND") {
    sendError(response, 404);
  } else if (code === "NAME_TAKEN") {
    sendError(response, 409);
  } else if (code === "FORBIDDEN_KEY") {
    getLogger().warn({ url: request.originalUrl, userId: request.user?.id }, "library: rejected — image key is not the caller's upload");
    sendError(response, 403);
  } else {
    getLogger().error({ err: error, url: request.originalUrl }, "library: unexpected error");
    sendError(response, 500);
  }
}

// ---------------------------------------------------------------------------
// Coach: exercises
// ---------------------------------------------------------------------------

coachExerciseRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = exerciseQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    getLogger().debug({ issues: parsed.error.flatten() }, "GET /coach/exercises: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Exercises retrieved successfully.",
      ...(await listCoachExercises(user.id, parsed.data)),
    });
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});

coachExerciseRouter.post("/", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = coachCreateExerciseSchema.safeParse(request.body);
  if (!parsed.success) {
    getLogger().debug({ issues: parsed.error.flatten() }, "POST /coach/exercises: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.status(201).json({
      message: "Exercise saved successfully.",
      exercise: await createCoachExercise(user.id, parsed.data),
    });
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});

// ---------------------------------------------------------------------------
// Coach: diet items
// ---------------------------------------------------------------------------

coachDietItemRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = dietItemQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    getLogger().debug({ issues: parsed.error.flatten() }, "GET /coach/diet-items: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Diet items retrieved successfully.",
      ...(await listCoachDietItems(user.id, parsed.data)),
    });
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});

coachDietItemRouter.post("/", async (request, response) => {
  const user = requireRole(request, response, "COACH");
  if (!user) return;

  const parsed = coachCreateDietItemSchema.safeParse(request.body);
  if (!parsed.success) {
    getLogger().debug({ issues: parsed.error.flatten() }, "POST /coach/diet-items: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.status(201).json({
      message: "Diet item saved successfully.",
      dietItem: await createCoachDietItem(user.id, parsed.data),
    });
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});

// ---------------------------------------------------------------------------
// Admin: global exercises
// ---------------------------------------------------------------------------

adminExerciseRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  const parsed = adminExerciseQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    getLogger().debug({ issues: parsed.error.flatten() }, "GET /admin/exercises: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Exercises retrieved successfully.",
      ...(await listGlobalExercises(parsed.data)),
    });
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});

adminExerciseRouter.get("/:id", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  try {
    response.json({
      message: "Exercise retrieved successfully.",
      exercise: await getGlobalExercise(request.params.id),
    });
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});

adminExerciseRouter.post("/", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  const parsed = adminCreateExerciseSchema.safeParse(request.body);
  if (!parsed.success) {
    getLogger().debug({ issues: parsed.error.flatten() }, "POST /admin/exercises: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.status(201).json({
      message: "Exercise created successfully.",
      exercise: await createGlobalExercise(user.id, parsed.data),
    });
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});

adminExerciseRouter.patch("/:id", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  const parsed = adminUpdateExerciseSchema.safeParse(request.body);
  if (!parsed.success) {
    getLogger().debug({ issues: parsed.error.flatten() }, "PATCH /admin/exercises/:id: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Exercise updated successfully.",
      exercise: await updateGlobalExercise(user.id, request.params.id, parsed.data),
    });
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});

adminExerciseRouter.delete("/:id", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  try {
    await deleteGlobalExercise(request.params.id);
    response.status(204).end();
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});

// ---------------------------------------------------------------------------
// Admin: global diet items
// ---------------------------------------------------------------------------

adminDietItemRouter.get("/", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  const parsed = adminDietItemQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    getLogger().debug({ issues: parsed.error.flatten() }, "GET /admin/diet-items: rejected — invalid query parameters");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Diet items retrieved successfully.",
      ...(await listGlobalDietItems(parsed.data)),
    });
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});

adminDietItemRouter.get("/:id", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  try {
    response.json({
      message: "Diet item retrieved successfully.",
      dietItem: await getGlobalDietItem(request.params.id),
    });
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});

adminDietItemRouter.post("/", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  const parsed = adminCreateDietItemSchema.safeParse(request.body);
  if (!parsed.success) {
    getLogger().debug({ issues: parsed.error.flatten() }, "POST /admin/diet-items: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.status(201).json({
      message: "Diet item created successfully.",
      dietItem: await createGlobalDietItem(user.id, parsed.data),
    });
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});

adminDietItemRouter.patch("/:id", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  const parsed = adminUpdateDietItemSchema.safeParse(request.body);
  if (!parsed.success) {
    getLogger().debug({ issues: parsed.error.flatten() }, "PATCH /admin/diet-items/:id: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    response.json({
      message: "Diet item updated successfully.",
      dietItem: await updateGlobalDietItem(user.id, request.params.id, parsed.data),
    });
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});

adminDietItemRouter.delete("/:id", async (request, response) => {
  const user = requireRole(request, response, "ADMIN");
  if (!user) return;

  try {
    await deleteGlobalDietItem(request.params.id);
    response.status(204).end();
  } catch (error) {
    respondToLibraryError(response, request, error);
  }
});
