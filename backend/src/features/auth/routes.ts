import { Router } from "express";

import { logger } from "../../config/logger.js";
import { sendError } from "../../utils/http-error.js";
import {
  forgotPasswordSchema,
  googleSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./schemas.js";
import { login, loginWithGoogle, register, requestPasswordReset, resetPassword } from "./service.js";

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

authRouter.post("/forgot-password", async (request, response) => {
  const parsed = forgotPasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "POST /auth/forgot-password: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    await requestPasswordReset(parsed.data);
  } catch (error) {
    // Swallow: the response must not differ based on what happened server-side,
    // or it becomes a way to test which addresses have accounts.
    logger.error({ err: error }, "POST /auth/forgot-password: unexpected error");
  }

  response.json({
    message: "If that email has an account, a reset code is on its way.",
  });
});

authRouter.post("/reset-password", async (request, response) => {
  const parsed = resetPasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    logger.debug({ issues: parsed.error.flatten() }, "POST /auth/reset-password: rejected — invalid request body");
    sendError(response, 400);
    return;
  }

  try {
    await resetPassword(parsed.data);
    response.json({ message: "Password updated successfully." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (code === "INVALID_RESET_CODE") {
      // One status for wrong / expired / used / unknown — the specific reason
      // is in the debug log only.
      sendError(response, 400);
      return;
    }
    logger.error({ err: error }, "POST /auth/reset-password: unexpected error");
    sendError(response, 500);
  }
});
