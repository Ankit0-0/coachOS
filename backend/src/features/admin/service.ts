import type { CoachApprovalStatus, Plan, Prisma } from "@prisma/client";

import { logger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";

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

// ---------------------------------------------------------------------------
// Coaches
// ---------------------------------------------------------------------------

export async function listCoaches(status?: CoachApprovalStatus) {
  const coaches = await prisma.user.findMany({
    where: { role: "COACH", ...(status ? { coachApprovalStatus: status } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      coachApprovalStatus: true,
      // An accepted invite is what actually makes someone this coach's
      // client, so it is the only thing worth counting.
      _count: { select: { sentInvites: { where: { status: "ACCEPTED" } } } },
    },
  });

  return coaches.map((coach) => ({
    id: coach.id,
    name: coach.name,
    email: coach.email,
    memberSince: coach.createdAt,
    approvalStatus: coach.coachApprovalStatus,
    clientCount: coach._count.sentInvites,
  }));
}

export async function getCoach(coachId: string) {
  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    include: {
      coachProfile: true,
      sentInvites: {
        where: { status: "ACCEPTED" },
        orderBy: { respondedAt: "desc" },
        include: { client: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!coach || coach.role !== "COACH") {
    logger.debug({ coachId, found: Boolean(coach) }, "getCoach: rejected — no coach with this id");
    throw new Error("COACH_NOT_FOUND");
  }

  return {
    id: coach.id,
    name: coach.name,
    email: coach.email,
    memberSince: coach.createdAt,
    approvalStatus: coach.coachApprovalStatus,
    bio: coach.coachProfile?.bio ?? null,
    specialties: coach.coachProfile?.specialties ?? [],
    yearsExperience: coach.coachProfile?.yearsExperience ?? null,
    phone: coach.coachProfile?.phone ?? null,
    clients: coach.sentInvites.map((invite) => ({
      inviteId: invite.id,
      // Null when the invite was accepted by someone whose account has since
      // been removed; the email on the invite is the durable record.
      id: invite.client?.id ?? null,
      name: invite.client?.name ?? null,
      email: invite.client?.email ?? invite.clientEmail,
      since: invite.respondedAt,
    })),
    clientCount: coach.sentInvites.length,
  };
}

export async function setCoachApproval(coachId: string, status: CoachApprovalStatus) {
  const coach = await prisma.user.findUnique({ where: { id: coachId }, select: { role: true } });
  if (!coach || coach.role !== "COACH") {
    logger.debug({ coachId }, "setCoachApproval: rejected — no coach with this id");
    throw new Error("COACH_NOT_FOUND");
  }

  const updated = await prisma.user.update({
    where: { id: coachId },
    data: { coachApprovalStatus: status },
    select: { id: true, name: true, email: true, coachApprovalStatus: true },
  });
  logger.debug({ coachId, status }, "setCoachApproval: approval status changed");

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    approvalStatus: updated.coachApprovalStatus,
  };
}

// ---------------------------------------------------------------------------
// Default (shared library) plans
// ---------------------------------------------------------------------------

export async function listDefaultPlans(type: "WORKOUT" | "DIET") {
  const plans = await prisma.plan.findMany({
    where: { isDefault: true, type },
    orderBy: { createdAt: "desc" },
  });
  return plans.map(serializePlan);
}

export async function getDefaultPlan(planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isDefault) {
    logger.debug({ planId, isDefault: plan?.isDefault }, "getDefaultPlan: rejected — not a default plan");
    throw new Error("PLAN_NOT_FOUND");
  }
  return serializePlan(plan);
}

export async function createDefaultPlan(input: {
  type: "WORKOUT" | "DIET";
  title: string;
  description?: string | undefined;
  content: Prisma.InputJsonValue;
}) {
  const plan = await prisma.plan.create({
    data: {
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      content: input.content,
      isDefault: true,
      // No owner: a library plan belongs to the platform, not to the admin who
      // happened to type it in, so it survives that admin's account being
      // removed and never shows up in anyone's "own plans" list.
      createdById: null,
    },
  });
  logger.debug({ planId: plan.id, type: plan.type }, "createDefaultPlan: default plan created");
  // The 10-per-type cap is a coach limit. The shared library is curated by
  // admins and is not bounded by it.
  return serializePlan(plan);
}

export async function updateDefaultPlan(
  planId: string,
  input: { title?: string | undefined; description?: string | undefined; content?: Prisma.InputJsonValue | undefined },
) {
  const existing = await prisma.plan.findUnique({ where: { id: planId } });
  if (!existing || !existing.isDefault) {
    logger.debug({ planId }, "updateDefaultPlan: rejected — not a default plan");
    throw new Error("PLAN_NOT_FOUND");
  }

  if (input.content !== undefined) {
    // A plan's type and its stored content have to keep matching, and the
    // type itself is not editable, so the new content must fit the old type.
    const looksLikeWorkout = typeof input.content === "object" && input.content !== null && "exercises" in input.content;
    const contentType = looksLikeWorkout ? "WORKOUT" : "DIET";
    if (contentType !== existing.type) {
      logger.debug({ planId, planType: existing.type, contentType }, "updateDefaultPlan: rejected — content type mismatch");
      throw new Error("CONTENT_TYPE_MISMATCH");
    }
  }

  const plan = await prisma.plan.update({
    where: { id: planId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
    },
  });
  logger.debug({ planId }, "updateDefaultPlan: default plan updated");
  return serializePlan(plan);
}

export async function deleteDefaultPlan(planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isDefault) {
    logger.debug({ planId }, "deleteDefaultPlan: rejected — not a default plan");
    throw new Error("PLAN_NOT_FOUND");
  }

  // Defaults get assigned to clients like any other plan, so the same guard
  // applies: deleting one out from under an active client would strand them.
  const activeAssignment = await prisma.planAssignment.findFirst({
    where: { planId, status: "ACTIVE" },
    select: { id: true },
  });
  if (activeAssignment) {
    logger.debug({ planId, assignmentId: activeAssignment.id }, "deleteDefaultPlan: rejected — a client is active on this plan");
    throw new Error("PLAN_IN_USE");
  }

  await prisma.plan.delete({ where: { id: planId } });
  logger.debug({ planId }, "deleteDefaultPlan: default plan deleted");
}
