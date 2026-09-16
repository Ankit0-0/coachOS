import type { Plan, PlanAssignment, PlanType, Prisma } from "@prisma/client";

import { getLogger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { assertCoachApproved } from "../../utils/coach-approval.js";
import { findAcceptedInvite } from "../../utils/coach-access.js";
import { parseDateKey } from "../../utils/calendar.js";
import { normalizePlanContent } from "./content.js";

const PLAN_LIMIT_PER_TYPE = 10;

/**
 * `activeAssignmentCount` is only sent where it has been counted — the plan
 * screens use it to warn that an edit reaches clients today, and an absent
 * count means "not asked", not "none".
 */
function serializePlan(plan: Plan, activeAssignmentCount?: number) {
  // Normalized on the way out, so a plan written before cycles existed reads as
  // a one-day cycle whether or not the backfill has run.
  const content = normalizePlanContent(plan.type, plan.content);
  return {
    id: plan.id,
    type: plan.type,
    title: plan.title,
    description: plan.description,
    content,
    cycleLengthDays: content.days.length,
    isDefault: plan.isDefault,
    createdById: plan.createdById,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    ...(activeAssignmentCount === undefined ? {} : { activeAssignmentCount }),
  };
}

/** How many clients are on each of these plans right now, keyed by plan id. */
async function countActiveAssignments(planIds: string[]): Promise<Map<string, number>> {
  if (planIds.length === 0) return new Map();
  const rows = await prisma.planAssignment.groupBy({
    by: ["planId"],
    where: { planId: { in: planIds }, status: "ACTIVE" },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.planId, row._count._all]));
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

/**
 * Which kind of plan a content object describes. A cycle says so in its days;
 * legacy content says so at the top level.
 */
function contentTypeOf(content: unknown): PlanType | null {
  if (!content || typeof content !== "object") return null;
  const record = content as Record<string, unknown>;
  const days = Array.isArray(record.days) ? (record.days as Record<string, unknown>[]) : null;
  if (days) {
    if (days.some((day) => Array.isArray(day?.exercises))) return "WORKOUT";
    if (days.some((day) => Array.isArray(day?.meals))) return "DIET";
    return null;
  }
  if ("exercises" in record) return "WORKOUT";
  if ("meals" in record) return "DIET";
  return null;
}

export async function createPlan(
  coachId: string,
  input: {
    type: PlanType;
    title: string;
    description?: string | undefined;
    cycleLengthDays: number;
    content: Prisma.InputJsonValue;
  },
) {
  await assertCoachApproved(coachId);

  const count = await prisma.plan.count({ where: { createdById: coachId, type: input.type, isDefault: false } });
  if (count >= PLAN_LIMIT_PER_TYPE) {
    getLogger().debug({ coachId, type: input.type, count, limit: PLAN_LIMIT_PER_TYPE }, "createPlan: rejected — plan limit reached");
    throw new Error("PLAN_LIMIT_REACHED");
  }

  const plan = await prisma.plan.create({
    data: {
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      content: input.content,
      cycleLengthDays: input.cycleLengthDays,
      createdById: coachId,
    },
  });
  getLogger().info({ coachId, planId: plan.id, type: plan.type }, "createPlan: plan created");
  return serializePlan(plan);
}

export async function listCoachPlans(coachId: string, type: PlanType) {
  const [own, defaults] = await Promise.all([
    prisma.plan.findMany({ where: { createdById: coachId, type, isDefault: false }, orderBy: { createdAt: "desc" } }),
    prisma.plan.findMany({ where: { isDefault: true, type }, orderBy: { createdAt: "desc" } }),
  ]);
  const active = await countActiveAssignments(own.map((plan) => plan.id));
  return {
    own: own.map((plan) => serializePlan(plan, active.get(plan.id) ?? 0)),
    // A default is shared across every coach, so a count of "clients on it"
    // would be someone else's number, not this coach's.
    defaults: defaults.map((plan) => serializePlan(plan)),
  };
}

export async function getPlan(coachId: string, planId: string) {
  const plan = await findAccessiblePlan(coachId, planId);
  if (!plan) {
    getLogger().debug({ coachId, planId }, "getPlan: rejected — not found or not accessible to this coach");
    throw new Error("PLAN_NOT_FOUND");
  }
  if (plan.isDefault) return serializePlan(plan);
  const active = await countActiveAssignments([plan.id]);
  return serializePlan(plan, active.get(plan.id) ?? 0);
}

export async function updatePlan(
  coachId: string,
  planId: string,
  input: {
    title?: string | undefined;
    description?: string | undefined;
    cycleLengthDays?: number | undefined;
    content?: Prisma.InputJsonValue | undefined;
  },
) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    getLogger().debug({ coachId, planId }, "updatePlan: rejected — plan not found");
    throw new Error("PLAN_NOT_FOUND");
  }
  if (plan.isDefault || plan.createdById !== coachId) {
    getLogger().warn(
      { coachId, planId, isDefault: plan.isDefault, ownerId: plan.createdById },
      "updatePlan: rejected — not the owner, or plan is a default",
    );
    throw new Error("FORBIDDEN");
  }

  if (input.content !== undefined) {
    const contentType = contentTypeOf(input.content);
    if (contentType !== plan.type) {
      getLogger().debug(
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
      ...(input.cycleLengthDays !== undefined ? { cycleLengthDays: input.cycleLengthDays } : {}),
    },
  });
  getLogger().info({ coachId, planId }, "updatePlan: plan updated");
  return serializePlan(updated);
}

export async function deletePlan(coachId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    getLogger().debug({ coachId, planId }, "deletePlan: rejected — plan not found");
    throw new Error("PLAN_NOT_FOUND");
  }
  if (plan.isDefault || plan.createdById !== coachId) {
    getLogger().warn(
      { coachId, planId, isDefault: plan.isDefault, ownerId: plan.createdById },
      "deletePlan: rejected — not the owner, or plan is a default",
    );
    throw new Error("FORBIDDEN");
  }

  const activeAssignment = await prisma.planAssignment.findFirst({ where: { planId, status: "ACTIVE" } });
  if (activeAssignment) {
    getLogger().debug(
      { coachId, planId, assignmentId: activeAssignment.id },
      "deletePlan: rejected — a client is currently active on this plan",
    );
    throw new Error("PLAN_IN_USE");
  }

  await prisma.plan.delete({ where: { id: planId } });
  getLogger().info({ coachId, planId }, "deletePlan: plan deleted");
}

export async function createAssignment(
  coachId: string,
  input: { clientId: string; planId: string; startDate?: string | undefined },
) {
  await assertCoachApproved(coachId);

  const invite = await findAcceptedInvite(coachId, input.clientId);
  if (!invite) {
    getLogger().warn(
      { coachId, clientId: input.clientId },
      "createAssignment: rejected — no accepted invite between this coach and client",
    );
    throw new Error("NOT_YOUR_CLIENT");
  }

  const plan = await findAccessiblePlan(coachId, input.planId);
  if (!plan) {
    getLogger().debug({ coachId, planId: input.planId }, "createAssignment: rejected — plan not found or not accessible");
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
      // The date the cycle counts from. A coach who wants day 1 on a Monday
      // assigns with that Monday; today is the sensible default.
      startDate: input.startDate ? parseDateKey(input.startDate) : new Date(),
    },
    include: { plan: true },
  });
  getLogger().info(
    { coachId, clientId: input.clientId, planId: plan.id, assignmentId: assignment.id },
    "createAssignment: plan assigned, any prior active assignment of the same type was completed",
  );
  return serializeAssignment(assignment);
}

export async function listClientAssignments(coachId: string, clientId: string) {
  const invite = await findAcceptedInvite(coachId, clientId);
  if (!invite) {
    getLogger().warn({ coachId, clientId }, "listClientAssignments: rejected — no accepted invite between this coach and client");
    throw new Error("NOT_YOUR_CLIENT");
  }

  const rows = await prisma.planAssignment.findMany({
    where: { clientId },
    include: { plan: true },
    orderBy: { assignedAt: "desc" },
  });
  return rows.map(serializeAssignment);
}
