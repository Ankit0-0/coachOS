import { Router } from "express";

import { authRouter } from "./features/auth/routes.js";
import { requireAuth } from "./middleware/auth.js";

const router: ReturnType<typeof Router> = Router();

router.use("/auth", authRouter);

router.get("/health", (_request, response) => {
  response.json({ message: "Health check successful.", status: "ok" });
});

router.get("/me", requireAuth, (request, response) => {
  response.json({ message: "User profile retrieved successfully.", user: request.user });
});

export { router };