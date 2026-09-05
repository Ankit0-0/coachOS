import type { Plan, PlanAssignment, PlanType, Prisma } from "@prisma/client";

import { logger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { findAcceptedInvite } from "../../utils/coach-access.js";

const PLAN_LIMIT_PER_TYPE = 10;

function serializePlan(plan: Plan) {
  return {
    id: plan.id,
    type: plan.type,
    title: plan.title,
    description: plan.description,
    content: plan.content,
    isDefault: plan.isDefault,
    createdById: plan.createdById,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

function serializeAssignment(row: PlanAssignment & { plan: Plan }) {
  return {
    id: row.id,
    planId: row.planId,
    plan: serializePlan(row.plan),
    coachId: row.coachId,
    clientId: row.clientId,
    status: row.status,
    assignedAt: row.assignedAt,
    startDate: row.startDate,
    endDate: row.endDate,
  };
}

/** A plan the coach may read/assign: their own, or any default plan. Never another coach's plan. */
async function findAccessiblePlan(coachId: string, planId: string): Promise<Plan | null> {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return null;
  if (plan.isDefault) return plan;
  if (plan.createdById === coachId) return plan;
  return null;
}

function contentTypeOf(content: unknown): PlanType | null {
  if (!content || typeof content !== "object") return null;
  if ("exercises" in content) return "WORKOUT";
  if ("meals" in content) return "DIET";
  return null;
}

export async function createPlan(
  coachId: string,
  input: { type: PlanType; title: string; description?: string | undefined; content: Prisma.InputJsonValue },
) {
  const count = await prisma.plan.count({ where: { createdById: coachId, type: input.type, isDefault: false } });
  if (count >= PLAN_LIMIT_PER_TYPE) {
    logger.debug({ coachId, type: input.type, count, limit: PLAN_LIMIT_PER_TYPE }, "createPlan: rejected — plan limit reached");
    throw new Error("PLAN_LIMIT_REACHED");
  }

  const plan = await prisma.plan.create({
    data: {
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      content: input.content,
      createdById: coachId,
    },
  });
  logger.debug({ coachId, planId: plan.id, type: plan.type }, "createPlan: plan created");
  return serializePlan(plan);
}

export async function listCoachPlans(coachId: string, type: PlanType) {
  const [own, defaults] = await Promise.all([
    prisma.plan.findMany({ where: { createdById: coachId, type, isDefault: false }, orderBy: { createdAt: "desc" } }),
    prisma.plan.findMany({ where: { isDefault: true, type }, orderBy: { createdAt: "desc" } }),
  ]);
  return { own: own.map(serializePlan), defaults: defaults.map(serializePlan) };
}

export async function getPlan(coachId: string, planId: string) {
  const plan = await findAccessiblePlan(coachId, planId);
  if (!plan) {
    logger.debug({ coachId, planId }, "getPlan: rejected — not found or not accessible to this coach");
    throw new Error("PLAN_NOT_FOUND");
  }
  return serializePlan(plan);
}

export async function updatePlan(
  coachId: string,
  planId: string,
  input: { title?: string | undefined; description?: string | undefined; content?: Prisma.InputJsonValue | undefined },
) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    logger.debug({ coachId, planId }, "updatePlan: rejected — plan not found");
    throw new Error("PLAN_NOT_FOUND");
  }
  if (plan.isDefault || plan.createdById !== coachId) {
    logger.debug(
      { coachId, planId, isDefault: plan.isDefault, ownerId: plan.createdById },
      "updatePlan: rejected — not the owner, or plan is a default",
    );
    throw new Error("FORBIDDEN");
  }

  if (input.content !== undefined) {
    const contentType = contentTypeOf(input.content);
    if (contentType !== plan.type) {
      logger.debug(
        { coachId, planId, planType: plan.type, contentType },
        "updatePlan: rejected — content shape does not match the plan's type",
      );
      throw new Error("CONTENT_TYPE_MISMATCH");
    }
  }

  const updated = await prisma.plan.update({
    where: { id: planId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
    },
  });
  logger.debug({ coachId, planId }, "updatePlan: plan updated");
  return serializePlan(updated);
}

export async function deletePlan(coachId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    logger.debug({ coachId, planId }, "deletePlan: rejected — plan not found");
    throw new Error("PLAN_NOT_FOUND");
  }
  if (plan.isDefault || plan.createdById !== coachId) {
    logger.debug(
      { coachId, planId, isDefault: plan.isDefault, ownerId: plan.createdById },
      "deletePlan: rejected — not the owner, or plan is a default",
    );
    throw new Error("FORBIDDEN");
  }

  const activeAssignment = await prisma.planAssignment.findFirst({ where: { planId, status: "ACTIVE" } });
  if (activeAssignment) {
    logger.debug(
      { coachId, planId, assignmentId: activeAssignment.id },
      "deletePlan: rejected — a client is currently active on this plan",
    );
    throw new Error("PLAN_IN_USE");
  }

  await prisma.plan.delete({ where: { id: planId } });
  logger.debug({ coachId, planId }, "deletePlan: plan deleted");
}

export async function createAssignment(coachId: string, input: { clientId: string; planId: string }) {
  const invite = await findAcceptedInvite(coachId, input.clientId);
  if (!invite) {
    logger.debug(
      { coachId, clientId: input.clientId },
      "createAssignment: rejected — no accepted invite between this coach and client",
    );
    throw new Error("NOT_YOUR_CLIENT");
  }

  const plan = await findAccessiblePlan(coachId, input.planId);
  if (!plan) {
    logger.debug({ coachId, planId: input.planId }, "createAssignment: rejected — plan not found or not accessible");
    throw new Error("PLAN_NOT_FOUND");
  }

  // A client can only have one ACTIVE assignment per plan type — completing
  // the previous one is a service-layer rule, not a DB constraint.
  await prisma.planAssignment.updateMany({
    where: { clientId: input.clientId, status: "ACTIVE", plan: { type: plan.type } },
    data: { status: "COMPLETED", endDate: new Date() },
  });

  const assignment = await prisma.planAssignment.create({
    data: {
      planId: plan.id,
      coachId,
      clientId: input.clientId,
      status: "ACTIVE",
      startDate: new Date(),
    },
    include: { plan: true },
  });
  logger.debug(
    { coachId, clientId: input.clientId, planId: plan.id, assignmentId: assignment.id },
    "createAssignment: plan assigned, any prior active assignment of the same type was completed",
  );
  return serializeAssignment(assignment);
}

export async function listClientAssignments(coachId: string, clientId: string) {
  const invite = await findAcceptedInvite(coachId, clientId);
  if (!invite) {
    logger.debug({ coachId, clientId }, "listClientAssignments: rejected — no accepted invite between this coach and client");
    throw new Error("NOT_YOUR_CLIENT");
  }

  const rows = await prisma.planAssignment.findMany({
    where: { clientId },
    include: { plan: true },
    orderBy: { assignedAt: "desc" },
  });
  return rows.map(serializeAssignment);
}
