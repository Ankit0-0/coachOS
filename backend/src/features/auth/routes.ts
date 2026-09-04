import { Router } from "express";

import { logger } from "../../config/logger.js";
import { sendError } from "../../utils/http-error.js";
import { googleSchema, loginSchema, registerSchema } from "./schemas.js";
import { login, loginWithGoogle, register } from "./service.js";

export const authRouter: ReturnType<typeof Router> = Router();

authRouter.post("/register", async (request, response) => {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "POST /auth/register: rejected — invalid request body");
    sendError(response, 400);
    return;
  }
  try {
    response.status(201).json({
      message: "Registration successful.",
      ...(await register(parsed.data)),
    });
  } catch (error) {
    const emailInUse = error instanceof Error && error.message === "EMAIL_IN_USE";
    if (!emailInUse) {
      logger.error({ err: error }, "POST /auth/register: unexpected error");
    }
    sendError(response, emailInUse ? 409 : 500);
  }
});

authRouter.post("/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "POST /auth/login: rejected — invalid request body");
    sendError(response, 400);
    return;
  }
  try {
    response.json({
      message: "Login successful.",
      ...(await login(parsed.data)),
    });
  } catch {
    // service.login already logged the specific reason (unknown email, no
    // password set, wrong password) at debug level.
    sendError(response, 401);
  }
});

authRouter.post("/google", async (request, response) => {
  const parsed = googleSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "POST /auth/google: rejected — invalid request body");
    sendError(response, 400);
    return;
  }
  try {
    const input = {
      idToken: parsed.data.idToken,
      ...(parsed.data.role === undefined ? {} : { role: parsed.data.role }),
    };
    response.json({
      message: "Google sign-in successful.",
      ...(await loginWithGoogle(input)),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "GOOGLE_AUTH_FAILED";
    const notConfigured = code === "GOOGLE_NOT_CONFIGURED";
    const invalidToken = code === "INVALID_GOOGLE_TOKEN";
    if (!notConfigured && !invalidToken) {
      logger.error({ err: error }, "POST /auth/google: unexpected error");
    }
    sendError(response, notConfigured ? 503 : 401);
  }
});
