import type { DietItem, Exercise, Prisma } from "@prisma/client";

import { getLogger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.config.js";
import { assertCoachApproved } from "../../utils/coach-approval.js";
import { isWorkoutContent, normalizePlanContent } from "../plan/content.js";
import { deleteObject, getSignedReadUrl } from "../upload/service.js";
import type {
  AdminCreateDietItemInput,
  AdminCreateExerciseInput,
  AdminUpdateDietItemInput,
  AdminUpdateExerciseInput,
  CoachCreateDietItemInput,
  CoachCreateExerciseInput,
  DietItemQuery,
  ExerciseQuery,
} from "./schemas.js";

/**
 * The library is an input aid for the plan editors. Plans store the name as a
 * plain string and never an id, so nothing here can change a saved plan.
 *
 * Rows with no owner are global and managed by admins; rows with an owner are
 * one coach's own. A coach sees the global rows and their own, never another
 * coach's. Admin routes see the global rows only, and answer 404 for a coach's
 * row so the admin UI never implies it exists.
 */

/** What the picker shows at once; typing more narrows it rather than paging. */
const COACH_RESULT_LIMIT = 50;
/** Rows fetched to rank before cutting down to COACH_RESULT_LIMIT. */
const COACH_CANDIDATE_LIMIT = 200;
export const ADMIN_PAGE_SIZE = 25;
/** Distinct names offered before the coach has typed anything. */
const RECENT_LIMIT = 12;
/** A coach's latest plans are the ones they are repeating. */
const RECENT_PLAN_LIMIT = 10;

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** "Bench  INCL" → ["bench", "incl"]. Capped so a pasted paragraph stays one query. */
function searchTerms(q: string | undefined): string[] {
  return (q ?? "").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
}

/** Every term somewhere in the name, in any order or case: "bench incl" finds "Incline bench press". */
function nameContainsAll(terms: string[]) {
  return terms.map((term) => ({ name: { contains: term, mode: "insensitive" as const } }));
}

/**
 * 0 when the name starts with what was typed, 1 when every term starts a word
 * in it, 2 for a match somewhere inside a word. "bench" puts "Bench press"
 * ahead of "Incline bench press", and both ahead of "Workbench carry".
 */
function matchRank(name: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  const lower = name.toLowerCase();
  if (lower.startsWith(terms.join(" "))) return 0;
  const words = lower.split(/[^a-z0-9]+/);
  return terms.every((term) => words.some((word) => word.startsWith(term))) ? 1 : 2;
}

/** The coach's own entries first, then the closest matches, then A-Z. */
function rankForCoach<T extends { name: string; createdById: string | null }>(rows: T[], terms: string[]): T[] {
  return rows
    .map((row) => ({ row, global: row.createdById === null ? 1 : 0, rank: matchRank(row.name, terms) }))
    .sort((a, b) => a.global - b.global || a.rank - b.rank || a.row.name.localeCompare(b.row.name))
    .slice(0, COACH_RESULT_LIMIT)
    .map(({ row }) => row);
}

function visibleTo(coachId: string) {
  return [{ createdById: null }, { createdById: coachId }];
}

function nameEquals(name: string) {
  return { name: { equals: name, mode: "insensitive" as const } };
}

/**
 * The distinct exercise names (or meal labels) in this coach's most recently
 * edited plans, newest plan first. Read from the plans themselves rather than
 * tracked separately, so it covers every plan written before the library
 * existed and works the same on any device.
 */
async function recentPlanItemNames(coachId: string, type: "WORKOUT" | "DIET"): Promise<string[]> {
  const plans = await prisma.plan.findMany({
    where: { createdById: coachId, type, isDefault: false },
    orderBy: { updatedAt: "desc" },
    take: RECENT_PLAN_LIMIT,
    select: { content: true },
  });

  const names: string[] = [];
  const seen = new Set<string>();
  for (const plan of plans) {
    const content = normalizePlanContent(type, plan.content);
    const items = isWorkoutContent(content)
      ? content.days.flatMap((day) => day.exercises.map((exercise) => exercise.name))
      : content.days.flatMap((day) => day.meals.map((meal) => meal.label));
    for (const raw of items) {
      const name = raw.trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      names.push(name);
      if (names.length === RECENT_LIMIT) return names;
    }
  }
  return names;
}

/** Pairs each recent name with its library entry, preferring the coach's own over a global one. */
function pairWithEntries<T extends { name: string; createdById: string | null }>(names: string[], rows: T[]) {
  const byName = new Map<string, T>();
  for (const row of rows) {
    const key = row.name.toLowerCase();
    const current = byName.get(key);
    if (!current || (current.createdById === null && row.createdById !== null)) byName.set(key, row);
  }
  return names.map((name) => ({ name, entry: byName.get(name.toLowerCase()) ?? null }));
}

// ---------------------------------------------------------------------------
// Shared write helpers
// ---------------------------------------------------------------------------

type ImagePurpose = "exercise" | "diet-item";

/**
 * Keys come back from the browser after presign, so they are checked like
 * every other key the server is handed: under the caller's own prefix, and in
 * the folder presign put them in for this kind of entry.
 */
function assertLibraryKey(key: string, adminId: string, purpose: ImagePurpose): void {
  if (!key.startsWith(`users/${adminId}/${purpose}/`)) {
    getLogger().debug({ adminId, purpose }, "library: rejected — image key is not the caller's upload for this purpose");
    throw new Error("FORBIDDEN_KEY");
  }
}

/** Drops an image nothing points at any more. After the write, never before. */
async function deleteImage(key: string | null, context: string): Promise<void> {
  if (!key) return;
  try {
    await deleteObject(key);
  } catch (error) {
    // A stray object costs pennies; failing the save would cost the admin their edit.
    getLogger().warn({ err: error, key }, `${context}: could not delete the replaced image`);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

/** Two requests racing past the name check land on the unique index instead. */
async function createOrConflict<T>(create: () => Promise<T>): Promise<T> {
  try {
    return await create();
  } catch (error) {
    if (isUniqueViolation(error)) throw new Error("NAME_TAKEN");
    throw error;
  }
}

/** Only the fields that were sent, so PATCH leaves the rest alone. */
function definedOnly<T extends Record<string, unknown>>(input: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

/** Async because the image key is resolved to a freshly signed URL on the way out. */
async function serializeExercise(row: Exercise) {
  return {
    id: row.id,
    name: row.name,
    primaryMuscles: row.primaryMuscles,
    secondaryMuscles: row.secondaryMuscles,
    trainingDay: row.trainingDay,
    equipment: row.equipment,
    instructions: row.instructions,
    videoUrl: row.videoUrl,
    imageUrl: await getSignedReadUrl(row.imageKey),
    /** Whether a key is stored, even where the bucket isn't configured to sign it. */
    hasImage: row.imageKey !== null,
    isGlobal: row.createdById === null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function exerciseFilters(query: ExerciseQuery): Prisma.ExerciseWhereInput {
  return {
    AND: nameContainsAll(searchTerms(query.q)),
    // Primary only: filtering for biceps should not list every row.
    ...(query.muscleGroup ? { primaryMuscles: { has: query.muscleGroup } } : {}),
    ...(query.trainingDay ? { trainingDay: query.trainingDay } : {}),
  };
}

async function assertExerciseNameFree(name: string, scope: Prisma.ExerciseWhereInput[], exceptId?: string) {
  const clash = await prisma.exercise.findFirst({
    where: { OR: scope, ...nameEquals(name), ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    getLogger().debug({ name, clashId: clash.id }, "library: rejected — an exercise with this name already exists");
    throw new Error("NAME_TAKEN");
  }
}

export async function listCoachExercises(coachId: string, query: ExerciseQuery) {
  const terms = searchTerms(query.q);
  const rows = await prisma.exercise.findMany({
    where: { OR: visibleTo(coachId), ...exerciseFilters(query) },
    orderBy: { name: "asc" },
    take: COACH_CANDIDATE_LIMIT,
  });

  // Recent only answers "what do I usually pick?", so it is offered on an
  // untouched picker and nowhere else.
  const isBlank = terms.length === 0 && !query.muscleGroup && !query.trainingDay;
  const recentNames = isBlank ? await recentPlanItemNames(coachId, "WORKOUT") : [];
  const recentRows =
    recentNames.length > 0
      ? await prisma.exercise.findMany({
          where: { AND: [{ OR: visibleTo(coachId) }, { OR: recentNames.map(nameEquals) }] },
        })
      : [];

  return {
    exercises: await Promise.all(rankForCoach(rows, terms).map(serializeExercise)),
    recent: await Promise.all(
      pairWithEntries(recentNames, recentRows).map(async ({ name, entry }) => ({
        name,
        exercise: entry ? await serializeExercise(entry) : null,
      })),
    ),
  };
}

export async function createCoachExercise(coachId: string, input: CoachCreateExerciseInput) {
  await assertCoachApproved(coachId);
  // Against the global list too: a private copy of "Bench press" would only
  // show up twice in this coach's picker.
  await assertExerciseNameFree(input.name, visibleTo(coachId));

  const row = await createOrConflict(() =>
    prisma.exercise.create({
      data: {
        name: input.name,
        primaryMuscles: input.primaryMuscles,
        secondaryMuscles: input.secondaryMuscles,
        trainingDay: input.trainingDay ?? null,
        equipment: input.equipment ?? null,
        instructions: input.instructions ?? null,
        videoUrl: input.videoUrl ?? null,
        createdById: coachId,
      },
    }),
  );
  getLogger().info({ coachId, exerciseId: row.id }, "createCoachExercise: saved to the coach's library");
  return serializeExercise(row);
}

async function findGlobalExercise(id: string): Promise<Exercise> {
  const row = await prisma.exercise.findFirst({ where: { id, createdById: null } });
  if (!row) {
    getLogger().debug({ exerciseId: id }, "library: rejected — no global exercise with this id");
    throw new Error("EXERCISE_NOT_FOUND");
  }
  return row;
}

export async function listGlobalExercises(query: ExerciseQuery & { page: number }) {
  const where: Prisma.ExerciseWhereInput = { createdById: null, ...exerciseFilters(query) };
  const [total, rows] = await Promise.all([
    prisma.exercise.count({ where }),
    prisma.exercise.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (query.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
  ]);
  return {
    exercises: await Promise.all(rows.map(serializeExercise)),
    total,
    page: query.page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export async function getGlobalExercise(id: string) {
  return serializeExercise(await findGlobalExercise(id));
}

export async function createGlobalExercise(adminId: string, input: AdminCreateExerciseInput) {
  await assertExerciseNameFree(input.name, [{ createdById: null }]);
  if (input.imageKey) assertLibraryKey(input.imageKey, adminId, "exercise");

  const row = await createOrConflict(() =>
    prisma.exercise.create({
      data: {
        name: input.name,
        primaryMuscles: input.primaryMuscles,
        secondaryMuscles: input.secondaryMuscles,
        trainingDay: input.trainingDay ?? null,
        equipment: input.equipment ?? null,
        instructions: input.instructions ?? null,
        videoUrl: input.videoUrl ?? null,
        imageKey: input.imageKey ?? null,
        // No owner: a global entry belongs to the platform, not the admin who typed it.
        createdById: null,
      },
    }),
  );
  getLogger().info({ exerciseId: row.id }, "createGlobalExercise: global exercise created");
  return serializeExercise(row);
}

export async function updateGlobalExercise(adminId: string, id: string, input: AdminUpdateExerciseInput) {
  const existing = await findGlobalExercise(id);
  if (input.name !== undefined && input.name !== existing.name) {
    await assertExerciseNameFree(input.name, [{ createdById: null }], id);
  }
  // Re-sending the stored key (the form saved without touching the image) is not a change.
  const imageChanged = input.imageKey !== undefined && input.imageKey !== existing.imageKey;
  if (imageChanged && input.imageKey) assertLibraryKey(input.imageKey, adminId, "exercise");

  const { imageKey, ...fields } = input;
  const row = await createOrConflict(() =>
    prisma.exercise.update({
      where: { id },
      data: { ...definedOnly(fields), ...(imageChanged ? { imageKey: imageKey ?? null } : {}) },
    }),
  );
  if (imageChanged) await deleteImage(existing.imageKey, "updateGlobalExercise");
  getLogger().info({ exerciseId: id, imageChanged }, "updateGlobalExercise: global exercise updated");
  return serializeExercise(row);
}

export async function deleteGlobalExercise(id: string) {
  const existing = await findGlobalExercise(id);
  await prisma.exercise.delete({ where: { id } });
  await deleteImage(existing.imageKey, "deleteGlobalExercise");
  getLogger().info({ exerciseId: id }, "deleteGlobalExercise: global exercise deleted");
}

// ---------------------------------------------------------------------------
// Diet items
// ---------------------------------------------------------------------------

async function serializeDietItem(row: DietItem) {
  return {
    id: row.id,
    name: row.name,
    mealType: row.mealType,
    calories: row.calories,
    proteinG: row.proteinG,
    notes: row.notes,
    imageUrl: await getSignedReadUrl(row.imageKey),
    hasImage: row.imageKey !== null,
    isGlobal: row.createdById === null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function dietItemFilters(query: DietItemQuery): Prisma.DietItemWhereInput {
  return {
    AND: nameContainsAll(searchTerms(query.q)),
    ...(query.mealType ? { mealType: query.mealType } : {}),
  };
}

async function assertDietItemNameFree(name: string, scope: Prisma.DietItemWhereInput[], exceptId?: string) {
  const clash = await prisma.dietItem.findFirst({
    where: { OR: scope, ...nameEquals(name), ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    getLogger().debug({ name, clashId: clash.id }, "library: rejected — a diet item with this name already exists");
    throw new Error("NAME_TAKEN");
  }
}

export async function listCoachDietItems(coachId: string, query: DietItemQuery) {
  const terms = searchTerms(query.q);
  const rows = await prisma.dietItem.findMany({
    where: { OR: visibleTo(coachId), ...dietItemFilters(query) },
    orderBy: { name: "asc" },
    take: COACH_CANDIDATE_LIMIT,
  });

  const isBlank = terms.length === 0 && !query.mealType;
  const recentNames = isBlank ? await recentPlanItemNames(coachId, "DIET") : [];
  const recentRows =
    recentNames.length > 0
      ? await prisma.dietItem.findMany({
          where: { AND: [{ OR: visibleTo(coachId) }, { OR: recentNames.map(nameEquals) }] },
        })
      : [];

  return {
    dietItems: await Promise.all(rankForCoach(rows, terms).map(serializeDietItem)),
    recent: await Promise.all(
      pairWithEntries(recentNames, recentRows).map(async ({ name, entry }) => ({
        name,
        dietItem: entry ? await serializeDietItem(entry) : null,
      })),
    ),
  };
}

export async function createCoachDietItem(coachId: string, input: CoachCreateDietItemInput) {
  await assertCoachApproved(coachId);
  await assertDietItemNameFree(input.name, visibleTo(coachId));

  const row = await createOrConflict(() =>
    prisma.dietItem.create({
      data: {
        name: input.name,
        mealType: input.mealType ?? null,
        calories: input.calories ?? null,
        proteinG: input.proteinG ?? null,
        notes: input.notes ?? null,
        createdById: coachId,
      },
    }),
  );
  getLogger().info({ coachId, dietItemId: row.id }, "createCoachDietItem: saved to the coach's library");
  return serializeDietItem(row);
}

async function findGlobalDietItem(id: string): Promise<DietItem> {
  const row = await prisma.dietItem.findFirst({ where: { id, createdById: null } });
  if (!row) {
    getLogger().debug({ dietItemId: id }, "library: rejected — no global diet item with this id");
    throw new Error("DIET_ITEM_NOT_FOUND");
  }
  return row;
}

export async function listGlobalDietItems(query: DietItemQuery & { page: number }) {
  const where: Prisma.DietItemWhereInput = { createdById: null, ...dietItemFilters(query) };
  const [total, rows] = await Promise.all([
    prisma.dietItem.count({ where }),
    prisma.dietItem.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (query.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
  ]);
  return {
    dietItems: await Promise.all(rows.map(serializeDietItem)),
    total,
    page: query.page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export async function getGlobalDietItem(id: string) {
  return serializeDietItem(await findGlobalDietItem(id));
}

export async function createGlobalDietItem(adminId: string, input: AdminCreateDietItemInput) {
  await assertDietItemNameFree(input.name, [{ createdById: null }]);
  if (input.imageKey) assertLibraryKey(input.imageKey, adminId, "diet-item");

  const row = await createOrConflict(() =>
    prisma.dietItem.create({
      data: {
        name: input.name,
        mealType: input.mealType ?? null,
        calories: input.calories ?? null,
        proteinG: input.proteinG ?? null,
        notes: input.notes ?? null,
        imageKey: input.imageKey ?? null,
        createdById: null,
      },
    }),
  );
  getLogger().info({ dietItemId: row.id }, "createGlobalDietItem: global diet item created");
  return serializeDietItem(row);
}

export async function updateGlobalDietItem(adminId: string, id: string, input: AdminUpdateDietItemInput) {
  const existing = await findGlobalDietItem(id);
  if (input.name !== undefined && input.name !== existing.name) {
    await assertDietItemNameFree(input.name, [{ createdById: null }], id);
  }
  const imageChanged = input.imageKey !== undefined && input.imageKey !== existing.imageKey;
  if (imageChanged && input.imageKey) assertLibraryKey(input.imageKey, adminId, "diet-item");

  const { imageKey, ...fields } = input;
  const row = await createOrConflict(() =>
    prisma.dietItem.update({
      where: { id },
      data: { ...definedOnly(fields), ...(imageChanged ? { imageKey: imageKey ?? null } : {}) },
    }),
  );
  if (imageChanged) await deleteImage(existing.imageKey, "updateGlobalDietItem");
  getLogger().info({ dietItemId: id, imageChanged }, "updateGlobalDietItem: global diet item updated");
  return serializeDietItem(row);
}

export async function deleteGlobalDietItem(id: string) {
  const existing = await findGlobalDietItem(id);
  await prisma.dietItem.delete({ where: { id } });
  await deleteImage(existing.imageKey, "deleteGlobalDietItem");
  getLogger().info({ dietItemId: id }, "deleteGlobalDietItem: global diet item deleted");
}
