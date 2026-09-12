import { Prisma, type CheckIn, type WeightEntry } from "@prisma/client";

import { prisma } from "../../config/prisma.config.js";
import { getSignedReadUrl, getSignedReadUrlMap, isOwnedKey } from "../upload/service.js";

type DateString = string;

export function parseDate(value: DateString): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function dateKey(value: Date): DateString {
  return value.toISOString().slice(0, 10);
}

/**
 * Async because the stored S3 keys are resolved to freshly signed URLs here.
 * The database column is `photoKeys` and the response field is `photoUrls` —
 * the naming difference is deliberate, so it stays obvious which side of the
 * wire you are looking at.
 */
export async function serializeCheckIn(row: CheckIn) {
  return {
    id: row.id,
    assignmentId: row.assignmentId,
    date: dateKey(row.date),
    completedItemIds: row.completedItemIds,
    notes: row.notes,
    photoUrls: await getSignedReadUrlMap(row.photoKeys),
    createdAt: row.createdAt,
  };
}

export async function serializeWeight(row: WeightEntry) {
  return {
    id: row.id,
    clientId: row.clientId,
    date: dateKey(row.date),
    weightKg: row.weightKg,
    photoUrl: await getSignedReadUrl(row.photoKey),
    createdAt: row.createdAt,
  };
}

/**
 * Keys reach the server by way of the client, so the caller's prefix is checked
 * before anything is stored against their record.
 */
function assertOwnedKeys(keys: string[], userId: string) {
  if (keys.some((key) => !isOwnedKey(key, userId))) throw new Error("FORBIDDEN_KEY");
}

export async function upsertCheckIn(
  input: {
    assignmentId: string;
    date: DateString;
    completedItemIds: string[];
    notes?: string | undefined;
    photoKeys?: Record<string, string> | null | undefined;
  },
  userId: string,
) {
  const assignment = await prisma.planAssignment.findUnique({ where: { id: input.assignmentId } });
  if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
  if (assignment.clientId !== userId) throw new Error("FORBIDDEN");

  if (input.photoKeys) assertOwnedKeys(Object.values(input.photoKeys), userId);

  // Prisma distinguishes a JSON null from "leave this column alone", so an
  // explicit null has to be spelled out as DbNull.
  const photoKeys =
    input.photoKeys === undefined ? undefined : (input.photoKeys ?? Prisma.DbNull);

  const date = parseDate(input.date);
  const checkIn = await prisma.checkIn.upsert({
    where: { assignmentId_date: { assignmentId: input.assignmentId, date } },
    update: {
      completedItemIds: input.completedItemIds,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(photoKeys !== undefined ? { photoKeys } : {}),
    },
    create: {
      assignmentId: input.assignmentId,
      date,
      completedItemIds: input.completedItemIds,
      notes: input.notes ?? null,
      photoKeys: photoKeys ?? Prisma.DbNull,
    },
  });
  return serializeCheckIn(checkIn);
}

export async function listCheckIns(
  input: { assignmentId: string; from: DateString; to: DateString },
  userId: string,
) {
  const assignment = await prisma.planAssignment.findUnique({ where: { id: input.assignmentId } });
  if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
  if (assignment.clientId !== userId) throw new Error("FORBIDDEN");

  const rows = await prisma.checkIn.findMany({
    where: {
      assignmentId: input.assignmentId,
      date: { gte: parseDate(input.from), lte: parseDate(input.to) },
    },
    orderBy: { date: "asc" },
  });
  return Promise.all(rows.map(serializeCheckIn));
}

export async function upsertWeight(
  input: { date: DateString; weightKg: number; photoKey?: string | null | undefined },
  userId: string,
) {
  if (input.photoKey) assertOwnedKeys([input.photoKey], userId);

  const date = parseDate(input.date);
  const entry = await prisma.weightEntry.upsert({
    where: { clientId_date: { clientId: userId, date } },
    update: {
      weightKg: input.weightKg,
      ...(input.photoKey !== undefined ? { photoKey: input.photoKey } : {}),
    },
    create: {
      clientId: userId,
      date,
      weightKg: input.weightKg,
      photoKey: input.photoKey ?? null,
    },
  });
  return serializeWeight(entry);
}

export async function listWeights(input: { from: DateString; to: DateString }, userId: string) {
  const rows = await prisma.weightEntry.findMany({
    where: {
      clientId: userId,
      date: { gte: parseDate(input.from), lte: parseDate(input.to) },
    },
    orderBy: { date: "asc" },
  });
  return Promise.all(rows.map(serializeWeight));
}

export async function listActiveAssignments(userId: string) {
  const rows = await prisma.planAssignment.findMany({
    where: { clientId: userId, status: "ACTIVE" },
    include: { plan: true },
    orderBy: { assignedAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    planId: row.planId,
    type: row.plan.type,
    title: row.plan.title,
    content: row.plan.content,
  }));
}
