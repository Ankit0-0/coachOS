import { Router } from "express";

import { googleSchema, loginSchema, registerSchema } from "./schemas.js";
import { login, loginWithGoogle, register } from "./service.js";

export const authRouter: ReturnType<typeof Router> = Router();

authRouter.post("/register", async (request, response) => {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      message: "Registration failed. Please check the submitted details.",
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
    return;
  }
  try {
    response.status(201).json({
      message: "Registration successful.",
      ...(await register(parsed.data)),
    });
  } catch (error) {
    const emailInUse = error instanceof Error && error.message === "EMAIL_IN_USE";
    response.status(emailInUse ? 409 : 500).json({
      message: emailInUse ? "Registration failed. This email is already registered." : "Registration failed due to a server error.",
      error: emailInUse ? "Email already registered" : "Internal server error",
    });
  }
});

authRouter.post("/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      message: "Login failed. Please provide a valid email and password.",
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
    return;
  }
  try {
    response.json({
      message: "Login successful.",
      ...(await login(parsed.data)),
    });
  } catch {
    response.status(401).json({
      message: "Login failed. The email or password is incorrect.",
      error: "Invalid email or password",
    });
  }
});

authRouter.post("/google", async (request, response) => {
  const parsed = googleSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      message: "Google sign-in failed. Please provide a valid Google ID token.",
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
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
    const message = error instanceof Error ? error.message : "GOOGLE_AUTH_FAILED";
    const notConfigured = message === "GOOGLE_NOT_CONFIGURED";
    response.status(notConfigured ? 503 : 401).json({
      message: notConfigured
        ? "Google sign-in is unavailable because it is not configured."
        : "Google sign-in failed. Please use a valid Google ID token.",
      error: notConfigured ? "Google authentication is not configured" : "Google sign-in failed",
    });
  }
});
