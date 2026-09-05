import { Router } from "express";

import { authRouter } from "./features/auth/routes.js";
import { clientInviteRouter, coachInviteRouter } from "./features/invite/routes.js";
import { coachAssignmentRouter, coachPlanRouter } from "./features/plan/routes.js";
import { trackingRouter } from "./features/tracking/routes.js";
import { requireAuth } from "./middleware/auth.js";

const router: ReturnType<typeof Router> = Router();

router.use("/auth", authRouter);
router.use("/tracking", trackingRouter);
router.use("/coach/invites", coachInviteRouter);
router.use("/client/invites", clientInviteRouter);
router.use("/coach/plans", coachPlanRouter);
router.use("/coach/assignments", coachAssignmentRouter);

router.get("/health", (_request, response) => {
  response.json({ message: "Health check successful.", status: "ok" });
});

router.get("/me", requireAuth, (request, response) => {
  response.json({ message: "User profile retrieved successfully.", user: request.user });
});

export { router };