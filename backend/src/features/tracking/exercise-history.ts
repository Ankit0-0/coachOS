import { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma.config.js";
import { isWorkoutContent, normalizePlanContent } from "../plan/content.js";
import { dateKey, parseDate } from "./service.js";

/** One set as performed; either number may be missing (bodyweight, or reps not counted). */
export type SetLog = { weightKg: number | null; reps: number | null };

/** One day's sets of one exercise, in set order. */
export type ExerciseSession = {
  date: string;
  sets: SetLog[];
  /** The heaviest set, more reps breaking a tie; null when no set has a number. */
  topSet: SetLog | null;
  /** Σ weight × reps over sets that have both. */
  volumeKg: number;
};

export type ExerciseHistory = {
  name: string;
  /** Oldest first. */
  sessions: ExerciseSession[];
  /** The heaviest set in the range, and the day it was lifted. */
  best: (SetLog & { date: string }) | null;
};

const SET_ID = /^(.*)-set(\d+)$/;

/** The stored { [setId]: SetLog } map, validated: Prisma types Json columns as unknown. */
export function readSetLogs(value: unknown): Record<string, SetLog> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>).flatMap(([setId, raw]): [string, SetLog][] => {
    if (!raw || typeof raw !== "object") return [];
    const { weightKg, reps } = raw as Record<string, unknown>;
    const log = {
      weightKg: typeof weightKg === "number" ? weightKg : null,
      reps: typeof reps === "number" ? reps : null,
    };
    return log.weightKg === null && log.reps === null ? [] : [[setId, log]];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

/** Heavier wins; at the same weight (or with no weight), more reps wins. */
function isBetter(candidate: SetLog, current: SetLog | null): boolean {
  if (!current) return true;
  const weight = (candidate.weightKg ?? -1) - (current.weightKg ?? -1);
  if (weight !== 0) return weight > 0;
  return (candidate.reps ?? -1) > (current.reps ?? -1);
}

/**
 * What a client lifted on each exercise across these assignments, between two
 * dates. Exercises are matched by name, not id: a plan's item ids carry their
 * day, and a changed or copied plan keeps the name, so "Bench press" on Monday
 * and on Thursday, or before and after a plan change, is one history.
 *
 * Sets are named from the plan as it is now; a set whose exercise has since
 * been removed from the plan can't be named, and is left out.
 */
export async function buildExerciseHistory(
  assignmentIds: string[],
  range: { from: string; to: string },
): Promise<ExerciseHistory[]> {
  if (assignmentIds.length === 0) return [];
  const rows = await prisma.checkIn.findMany({
    where: {
      assignmentId: { in: assignmentIds },
      date: { gte: parseDate(range.from), lte: parseDate(range.to) },
      setLogs: { not: Prisma.DbNull },
    },
    select: { date: true, setLogs: true, assignment: { select: { plan: { select: { type: true, content: true } } } } },
    orderBy: { date: "asc" },
  });

  // name key → date → set number → log
  const byExercise = new Map<string, { name: string; days: Map<string, Map<number, SetLog>> }>();
  for (const row of rows) {
    const logs = readSetLogs(row.setLogs);
    if (!logs || row.assignment.plan.type !== "WORKOUT") continue;
    const content = normalizePlanContent("WORKOUT", row.assignment.plan.content);
    if (!isWorkoutContent(content)) continue;
    const names = new Map(content.days.flatMap((day) => day.exercises.map((exercise) => [exercise.id, exercise.name] as const)));

    for (const [setId, log] of Object.entries(logs)) {
      const match = SET_ID.exec(setId);
      const name = match ? names.get(match[1] ?? "")?.trim() : undefined;
      if (!match || !name) continue;
      const key = name.toLowerCase();
      const entry = byExercise.get(key) ?? { name, days: new Map() };
      entry.name = name; // The latest spelling wins.
      const date = dateKey(row.date);
      const sets = entry.days.get(date) ?? new Map<number, SetLog>();
      sets.set(Number(match[2]), log);
      entry.days.set(date, sets);
      byExercise.set(key, entry);
    }
  }

  const histories: ExerciseHistory[] = [...byExercise.values()].map(({ name, days }) => {
    let best: ExerciseHistory["best"] = null;
    const sessions = [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, setMap]): ExerciseSession => {
        const sets = [...setMap.entries()].sort(([a], [b]) => a - b).map(([, log]) => log);
        let topSet: SetLog | null = null;
        for (const set of sets) if (isBetter(set, topSet)) topSet = set;
        if (topSet && isBetter(topSet, best)) best = { ...topSet, date };
        const volumeKg = sets.reduce((total, set) => total + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
        return { date, sets, topSet, volumeKg: Math.round(volumeKg * 10) / 10 };
      });
    return { name, sessions, best };
  });

  // Most recently trained first.
  return histories.sort(
    (a, b) => (b.sessions.at(-1)?.date ?? "").localeCompare(a.sessions.at(-1)?.date ?? "") || a.name.localeCompare(b.name),
  );
}
