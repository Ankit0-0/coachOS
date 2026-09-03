import { Router, type Request, type Response } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { checkInQuerySchema, checkInSchema, weightQuerySchema, weightSchema } from "./schemas.js";
import {
  listActiveAssignments,
  listCheckIns,
  listWeights,
  upsertCheckIn,
  upsertWeight,
} from "./service.js";

export const trackingRouter: ReturnType<typeof Router> = Router();

function currentUserId(request: Request, response: Response): string | null {
  const userId = request.user?.id;
  if (!userId) {
    response.status(401).json({
      message: "Authentication failed. Please sign in and try again.",
      error: "Unauthorized",
    });
    return null;
  }
  return userId;
}

trackingRouter.use(requireAuth);

trackingRouter.get("/assignments", async (request, response) => {
  const userId = currentUserId(request, response);
  if (!userId) return;
  try {
    response.json({
      message: "Active assignments retrieved successfully.",
      assignments: await listActiveAssignments(userId),
    });
  } catch {
    response.status(500).json({
      message: "Failed to retrieve active assignments.",
      error: "Internal server error",
    });
  }
});

trackingRouter.post("/checkin", async (request, response) => {
  const parsed = checkInSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      message: "Could not save the check-in. Please check the submitted details.",
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
    return;
  }
  const userId = currentUserId(request, response);
  if (!userId) return;
  try {
    response.json({
      message: "Check-in saved successfully.",
      checkIn: await upsertCheckIn(parsed.data, userId),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (code === "ASSIGNMENT_NOT_FOUND") {
      response.status(404).json({ message: "The assignment could not be found.", error: "Assignment not found" });
    } else if (code === "FORBIDDEN") {
      response.status(403).json({ message: "You can only check in to your own assignments.", error: "Forbidden" });
    } else {
      response.status(500).json({ message: "Could not save the check-in due to a server error.", error: "Internal server error" });
    }
  }
});

trackingRouter.get("/checkin", async (request, response) => {
  const parsed = checkInQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({
      message: "Could not retrieve check-ins. Please check the query parameters.",
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
    return;
  }
  const userId = currentUserId(request, response);
  if (!userId) return;
  try {
    response.json({
      message: "Check-ins retrieved successfully.",
      checkIns: await listCheckIns(parsed.data, userId),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (code === "ASSIGNMENT_NOT_FOUND") {
      response.status(404).json({ message: "The assignment could not be found.", error: "Assignment not found" });
    } else if (code === "FORBIDDEN") {
      response.status(403).json({ message: "You can only view your own assignments.", error: "Forbidden" });
    } else {
      response.status(500).json({ message: "Could not retrieve check-ins due to a server error.", error: "Internal server error" });
    }
  }
});

trackingRouter.post("/weight", async (request, response) => {
  const parsed = weightSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      message: "Could not save the weight entry. Please check the submitted details.",
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
    return;
  }
  const userId = currentUserId(request, response);
  if (!userId) return;
  try {
    response.json({
      message: "Weight entry saved successfully.",
      weightEntry: await upsertWeight(parsed.data, userId),
    });
  } catch {
    response.status(500).json({ message: "Could not save the weight entry due to a server error.", error: "Internal server error" });
  }
});

trackingRouter.get("/weight", async (request, response) => {
  const parsed = weightQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({
      message: "Could not retrieve weight entries. Please check the query parameters.",
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
    return;
  }
  const userId = currentUserId(request, response);
  if (!userId) return;
  try {
    response.json({
      message: "Weight entries retrieved successfully.",
      weightEntries: await listWeights(parsed.data, userId),
    });
  } catch {
    response.status(500).json({ message: "Could not retrieve weight entries due to a server error.", error: "Internal server error" });
  }
});
