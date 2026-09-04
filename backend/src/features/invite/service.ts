import type { CoachClientInvite, InviteStatus } from "@prisma/client";

import { logger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
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
    createdAt: row.createdAt,
    respondedAt: row.respondedAt,
  };
}

export async function createInvite(coachId: string, clientEmailInput: string) {
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
    data: { coachId, clientEmail, clientId },
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
  return rows.map(serializeInvite);
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
  return serializeInvite(updated);
}

export function acceptInvite(inviteId: string, userId: string, email: string) {
  return respondToInvite(inviteId, userId, email, "ACCEPTED");
}

export function declineInvite(inviteId: string, userId: string, email: string) {
  return respondToInvite(inviteId, userId, email, "DECLINED");
}
