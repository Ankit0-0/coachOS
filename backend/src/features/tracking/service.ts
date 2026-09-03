import type { CheckIn, WeightEntry } from "@prisma/client";

import { prisma } from "../../config/prisma.config.js";

type DateString = string;

function parseDate(value: DateString): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateKey(value: Date): DateString {
  return value.toISOString().slice(0, 10);
}

function serializeCheckIn(row: CheckIn) {
  return {
    id: row.id,
    assignmentId: row.assignmentId,
    date: dateKey(row.date),
    completedItemIds: row.completedItemIds,
    notes: row.notes,
    createdAt: row.createdAt,
  };
}

function serializeWeight(row: WeightEntry) {
  return {
    id: row.id,
    clientId: row.clientId,
    date: dateKey(row.date),
    weightKg: row.weightKg,
    photoUrl: row.photoUrl,
    createdAt: row.createdAt,
  };
}

export async function upsertCheckIn(
  input: { assignmentId: string; date: DateString; completedItemIds: string[]; notes?: string | undefined },
  userId: string,
) {
  const assignment = await prisma.planAssignment.findUnique({ where: { id: input.assignmentId } });
  if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
  if (assignment.clientId !== userId) throw new Error("FORBIDDEN");

  const date = parseDate(input.date);
  const checkIn = await prisma.checkIn.upsert({
    where: { assignmentId_date: { assignmentId: input.assignmentId, date } },
    update: {
      completedItemIds: input.completedItemIds,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    create: {
      assignmentId: input.assignmentId,
      date,
      completedItemIds: input.completedItemIds,
      notes: input.notes ?? null,
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
  return rows.map(serializeCheckIn);
}

export async function upsertWeight(
  input: { date: DateString; weightKg: number; photoUrl?: string | undefined },
  userId: string,
) {
  const date = parseDate(input.date);
  const entry = await prisma.weightEntry.upsert({
    where: { clientId_date: { clientId: userId, date } },
    update: {
      weightKg: input.weightKg,
      ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
    },
    create: {
      clientId: userId,
      date,
      weightKg: input.weightKg,
      photoUrl: input.photoUrl ?? null,
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
  return rows.map(serializeWeight);
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
