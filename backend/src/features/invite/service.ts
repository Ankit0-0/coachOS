import type { CoachClientInvite, InviteStatus } from "@prisma/client";

import { logger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { assertCoachApproved } from "../../utils/coach-approval.js";
import { createSubscriptionFromInvite, effectiveStatus } from "../subscription/service.js";
import { normalizeEmail } from "../../utils/email.js";

type PersonSummary = { id: string; name: string; email: string };

type InviteRow = CoachClientInvite & {
  coach?: PersonSummary | null;
  client?: PersonSummary | null;
};

function serializeInvite(row: InviteRow) {
  return {
    id: row.id,
    coachId: row.coachId,
    coach: row.coach ?? undefined,
    clientEmail: row.clientEmail,
    clientId: row.clientId,
    client: row.client ?? undefined,
    status: row.status,
    durationMonths: row.durationMonths,
    createdAt: row.createdAt,
    respondedAt: row.respondedAt,
  };
}

export async function createInvite(
  coachId: string,
  clientEmailInput: string,
  durationMonths?: number | undefined,
) {
  await assertCoachApproved(coachId);

  const clientEmail = normalizeEmail(clientEmailInput);

  const existing = await prisma.coachClientInvite.findFirst({
    where: { coachId, clientEmail, status: { in: ["PENDING", "ACCEPTED"] } },
  });
  if (existing) {
    logger.debug({ coachId, clientEmail, existingInviteId: existing.id, existingStatus: existing.status }, "createInvite: rejected — active invite already exists");
    throw new Error("INVITE_ALREADY_EXISTS");
  }

  const matchedClient = await prisma.user.findUnique({ where: { email: clientEmail } });
  const clientId = matchedClient && matchedClient.role === "CLIENT" ? matchedClient.id : null;

  const invite = await prisma.coachClientInvite.create({
    data: { coachId, clientEmail, clientId, durationMonths: durationMonths ?? null },
    include: { client: { select: { id: true, name: true, email: true } } },
  });
  logger.debug({ coachId, clientEmail, inviteId: invite.id, autoMatchedClientId: clientId }, "createInvite: invite created");
  return serializeInvite(invite);
}

export async function listCoachInvites(coachId: string, status?: InviteStatus) {
  const rows = await prisma.coachClientInvite.findMany({
    where: { coachId, ...(status ? { status } : {}) },
    include: { client: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  // The roster screen needs a lapsed marker per row. Fetching it here in one
  // query beats one request per client from the app, and this route is
  // coach-only so the extra field is never exposed to a client.
  const subscriptions = await prisma.subscription.findMany({
    where: { coachId, clientId: { in: rows.map((row) => row.clientId).filter((id): id is string => Boolean(id)) } },
    orderBy: { startDate: "desc" },
  });

  const latestByClient = new Map<string, (typeof subscriptions)[number]>();
  for (const subscription of subscriptions) {
    // Ordered newest first, so the first one seen for a client is the current one.
    if (!latestByClient.has(subscription.clientId)) latestByClient.set(subscription.clientId, subscription);
  }

  return rows.map((row) => {
    const subscription = row.clientId ? latestByClient.get(row.clientId) : undefined;
    return {
      ...serializeInvite(row),
      /** Null when this client has no subscription record — an open-ended relationship. */
      subscriptionStatus: subscription ? effectiveStatus(subscription) : null,
      subscriptionEndDate: subscription?.endDate ?? null,
    };
  });
}

export async function listClientInvites(clientId: string, email: string, status: InviteStatus = "PENDING") {
  const clientEmail = normalizeEmail(email);
  const rows = await prisma.coachClientInvite.findMany({
    where: { status, OR: [{ clientId }, { clientEmail }] },
    include: { coach: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeInvite);
}

async function respondToInvite(inviteId: string, userId: string, email: string, status: "ACCEPTED" | "DECLINED") {
  const invite = await prisma.coachClientInvite.findUnique({ where: { id: inviteId } });
  if (!invite) {
    logger.debug({ inviteId, userId }, "respondToInvite: rejected — invite not found");
    throw new Error("INVITE_NOT_FOUND");
  }

  const normalizedEmail = normalizeEmail(email);
  const isRecipient = invite.clientId === userId || invite.clientEmail === normalizedEmail;
  if (!isRecipient) {
    logger.debug(
      { inviteId, userId, email: normalizedEmail, inviteClientId: invite.clientId, inviteClientEmail: invite.clientEmail },
      "respondToInvite: rejected — caller is not the invite recipient",
    );
    throw new Error("FORBIDDEN");
  }
  if (invite.status !== "PENDING") {
    logger.debug({ inviteId, userId, currentStatus: invite.status }, "respondToInvite: rejected — invite already responded to");
    throw new Error("INVALID_STATUS");
  }

  const updated = await prisma.coachClientInvite.update({
    where: { id: inviteId },
    data: {
      status,
      respondedAt: new Date(),
      ...(status === "ACCEPTED" ? { clientId: userId } : {}),
    },
    include: { coach: { select: { id: true, name: true, email: true } } },
  });
  logger.debug({ inviteId, userId, status }, "respondToInvite: invite updated");

  // The relationship itself is already formed by the ACCEPTED invite above.
  // A subscription is the commercial record on top of it, and only exists
  // when the coach picked a duration when inviting.
  if (status === "ACCEPTED" && invite.durationMonths) {
    await createSubscriptionFromInvite(invite.coachId, userId, invite.durationMonths);
  }

  return serializeInvite(updated);
}

export function acceptInvite(inviteId: string, userId: string, email: string) {
  return respondToInvite(inviteId, userId, email, "ACCEPTED");
}

export function declineInvite(inviteId: string, userId: string, email: string) {
  return respondToInvite(inviteId, userId, email, "DECLINED");
}
