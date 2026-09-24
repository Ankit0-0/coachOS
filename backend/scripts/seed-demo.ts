/**
 * Demo data for one client account, safe to run against production.
 *
 * Run the dry run first — it writes nothing and prints every row it would
 * touch:
 *
 *   DATABASE_URL="postgres://…?uselibpqcompat=true&sslmode=require" \
 *     pnpm --filter backend exec tsx scripts/seed-demo.ts --dry-run
 *   DATABASE_URL="…" pnpm --filter backend exec tsx scripts/seed-demo.ts
 *   DATABASE_URL="…" pnpm --filter backend exec tsx scripts/seed-demo.ts --remove
 *
 * --client=someone@example.com seeds a different account, and
 * --coach=their@coach.com hangs the demo plans off a coach they already have
 * instead of creating one (no second coach, no second invite). Set
 * DEMO_COACH_PASSWORD to give the demo coach a password, so the coach side can
 * be signed into; without it the account exists only to own the demo plans.
 *
 * Idempotent: every write is an upsert or is skipped when the row is already
 * there, so a second run changes nothing.
 *
 * Reversible and scoped: everything it creates is tagged — plan titles start
 * with "[DEMO] ", notes carry "seeded-demo" — and --remove deletes only rows
 * it can prove are its own:
 *   - check-ins, through the assignments of its own plans
 *   - plans it created, and only while nobody else is assigned to them
 *   - weight entries whose date AND weight match what this script generates
 *     (the numbers come from a fixed seed, so they are reproducible)
 *   - the subscription and invite between the demo coach and this client
 *   - the demo coach itself, only when nothing else of its own is left
 * A row it did not create is never touched. The client user is never created
 * or deleted — that has to be deliberate, and a client who already has an
 * ACTIVE plan of either type is refused rather than quietly given a second.
 * --replace-active is the one exception: it completes those assignments, prints
 * their ids, and --remove does NOT put them back.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Prisma } from "@prisma/client";

import { prisma } from "../src/config/prisma.config.js";
import { hashPassword } from "../src/utils/password.js";
import { dayItemIds } from "../src/features/plan/content.js";
import { resolveDayIndex } from "../src/features/plan/schedule.js";
import { dietContentSchema, workoutContentSchema } from "../src/features/plan/schemas.js";
import { buildObjectKey, deleteObject, isS3Configured, putObject } from "../src/features/upload/service.js";
import { addDays, dateKeyOf, parseDateKey, type DateKey } from "../src/utils/calendar.js";
import { MAX_WEIGHT_KG } from "../src/utils/weight.js";

/** The account to seed. --client=someone@example.com targets another one. */
const CLIENT_EMAIL =
  process.argv.find((arg) => arg.startsWith("--client="))?.slice("--client=".length) ?? "ankitpundir.work@gmail.com";
/** --coach=… uses a coach the client already has, so no second coach is created. */
const COACH_EMAIL =
  process.argv.find((arg) => arg.startsWith("--coach="))?.slice("--coach=".length) ?? "demo.coach@coachos.app";
const usingOwnCoach = COACH_EMAIL !== "demo.coach@coachos.app";
const DEMO_PREFIX = "[DEMO] ";
const MARKER = "seeded-demo";
const HISTORY_DAYS = 30;

const dryRun = process.argv.includes("--dry-run");
const removing = process.argv.includes("--remove");
/** Opt-in: complete a plan the client is already on, so the demo one can take over. */
const replaceActive = process.argv.includes("--replace-active");

const assetsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "demo-assets");

function say(message: string): void {
  console.log(`${dryRun ? "[dry run] " : ""}${message}`);
}

// ---------------------------------------------------------------------------
// Deterministic randomness: the same dates, weights and completion every run,
// so --remove can recompute exactly what --seed produced.
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A number in [0,1) from a string. Each decision is keyed by its own date, so
 * it never depends on how many draws came before it — which is what makes a
 * re-run reach exactly the same answers.
 */
function roll(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

type Exercise = { id: string; name: string; note: string; sets: number; reps?: string; rest?: string };

function lift(day: number, slug: string, name: string, sets: number, reps: string, note = "", rest = "90s"): Exercise {
  return { id: `d${day}-${slug}`, name, note, sets, reps, rest };
}

function restDay(day: number, label = "Rest"): { dayIndex: number; label: string; isRestDay: true; duration: string; exercises: [] } {
  return { dayIndex: day, label, isRestDay: true, duration: "", exercises: [] };
}

function trainingDay(day: number, label: string, duration: string, exercises: Exercise[]) {
  return { dayIndex: day, label, isRestDay: false, duration, exercises };
}

function meal(day: number, slug: string, label: string): { id: string; label: string } {
  return { id: `d${day}-${slug}`, label };
}

const upperLower = {
  focus: "Upper/lower strength",
  summary: "Four lifting days, one easy day, two rest days.",
  difficulty: "Intermediate",
  days: [
    trainingDay(0, "Upper push", "55 min", [
      lift(0, "bench", "Barbell bench press", 4, "6-8", "Two seconds down"),
      lift(0, "ohp", "Seated overhead press", 3, "8-10"),
      lift(0, "dips", "Weighted dip", 3, "8", "Add weight when all sets hit 8"),
      lift(0, "lateral", "Lateral raise", 3, "12-15", "", "60s"),
    ]),
    trainingDay(1, "Lower", "60 min", [
      lift(1, "squat", "Back squat", 4, "5", "Belt from set three", "150s"),
      lift(1, "rdl", "Romanian deadlift", 3, "8"),
      lift(1, "split-squat", "Bulgarian split squat", 3, "10 each"),
      lift(1, "calf", "Standing calf raise", 4, "12", "", "45s"),
    ]),
    restDay(2),
    trainingDay(3, "Upper pull", "55 min", [
      lift(3, "pullup", "Weighted pull-up", 4, "6", "Full hang each rep"),
      lift(3, "row", "Chest-supported row", 4, "10"),
      lift(3, "facepull", "Face pull", 3, "15", "", "45s"),
      lift(3, "curl", "Incline dumbbell curl", 3, "12", "", "60s"),
    ]),
    trainingDay(4, "Lower pull", "55 min", [
      lift(4, "deadlift", "Trap bar deadlift", 4, "5", "Stop a rep short of grinding", "180s"),
      lift(4, "legcurl", "Seated leg curl", 3, "12"),
      lift(4, "hipthrust", "Hip thrust", 3, "10"),
    ]),
    trainingDay(5, "Conditioning", "30 min", [
      lift(5, "row-erg", "Rower intervals", 6, "250m", "Ninety seconds easy between", "90s"),
      lift(5, "carry", "Farmer carry", 4, "40m", "", "60s"),
    ]),
    restDay(6),
  ],
};

const pushPullLegs = {
  focus: "Push, pull, legs",
  summary: "Six training days on a week-long rotation with a midweek rest.",
  difficulty: "Advanced",
  days: [
    trainingDay(0, "Push", "60 min", [
      lift(0, "incline", "Incline barbell press", 4, "6-8"),
      lift(0, "machine-press", "Machine chest press", 3, "10-12"),
      lift(0, "tricep", "Cable triceps pushdown", 3, "12", "", "60s"),
    ]),
    trainingDay(1, "Pull", "60 min", [
      lift(1, "pulldown", "Lat pulldown", 4, "8-10"),
      lift(1, "cable-row", "Seated cable row", 3, "10"),
      lift(1, "hammer", "Hammer curl", 3, "12", "", "60s"),
    ]),
    trainingDay(2, "Legs", "65 min", [
      lift(2, "frontsquat", "Front squat", 4, "5", "", "150s"),
      lift(2, "legpress", "Leg press", 3, "12"),
      lift(2, "legext", "Leg extension", 3, "15", "", "45s"),
    ]),
    restDay(3),
    trainingDay(4, "Push", "55 min", [
      lift(4, "ohp", "Standing overhead press", 4, "6"),
      lift(4, "flye", "Cable flye", 3, "15", "", "45s"),
      lift(4, "skullcrusher", "Skull crusher", 3, "10"),
    ]),
    trainingDay(5, "Pull", "55 min", [
      lift(5, "barbell-row", "Barbell row", 4, "8"),
      lift(5, "shrug", "Dumbbell shrug", 3, "15", "", "45s"),
      lift(5, "preacher", "Preacher curl", 3, "10"),
    ]),
    trainingDay(6, "Legs", "60 min", [
      lift(6, "deadlift", "Conventional deadlift", 4, "3", "Reset every rep", "180s"),
      lift(6, "lunge", "Walking lunge", 3, "12 each"),
      lift(6, "calf", "Seated calf raise", 4, "15", "", "45s"),
    ]),
  ],
};

const fullBody = {
  focus: "Full body",
  summary: "Three sessions that rotate, for weeks where the calendar decides.",
  difficulty: "Beginner",
  days: [
    trainingDay(0, "Full body A", "45 min", [
      lift(0, "goblet", "Goblet squat", 3, "10"),
      lift(0, "pushup", "Push-up", 3, "12", "Slow down, no bouncing", "60s"),
      lift(0, "row", "One-arm dumbbell row", 3, "10 each"),
    ]),
    trainingDay(1, "Full body B", "45 min", [
      lift(1, "rdl", "Dumbbell Romanian deadlift", 3, "10"),
      lift(1, "press", "Dumbbell shoulder press", 3, "10"),
      lift(1, "pulldown", "Lat pulldown", 3, "12"),
    ]),
    trainingDay(2, "Full body C", "45 min", [
      lift(2, "legpress", "Leg press", 3, "12"),
      lift(2, "incline-db", "Incline dumbbell press", 3, "10"),
      lift(2, "facepull", "Face pull", 3, "15", "", "45s"),
    ]),
  ],
};

const trainingRestDiet = {
  focus: "Calories by the day",
  summary: "More on lifting days, less on rest days, protein the same throughout.",
  days: [
    { dayIndex: 0, label: "Training day", calories: "2,400 kcal", meals: [meal(0, "breakfast", "Oats, whey, banana"), meal(0, "lunch", "Chicken, rice, salad"), meal(0, "snack", "Greek yoghurt and berries"), meal(0, "dinner", "Salmon, potatoes, greens")] },
    { dayIndex: 1, label: "Training day", calories: "2,400 kcal", meals: [meal(1, "breakfast", "Eggs on toast"), meal(1, "lunch", "Beef mince, pasta, tomato"), meal(1, "snack", "Protein shake and an apple"), meal(1, "dinner", "Chicken curry and rice")] },
    { dayIndex: 2, label: "Rest day", calories: "2,000 kcal", meals: [meal(2, "breakfast", "Greek yoghurt, granola"), meal(2, "lunch", "Tuna salad"), meal(2, "dinner", "Stir-fried tofu and vegetables")] },
    { dayIndex: 3, label: "Training day", calories: "2,400 kcal", meals: [meal(3, "breakfast", "Oats, whey, berries"), meal(3, "lunch", "Chicken wrap"), meal(3, "snack", "Cottage cheese"), meal(3, "dinner", "Steak, sweet potato, broccoli")] },
    { dayIndex: 4, label: "Training day", calories: "2,400 kcal", meals: [meal(4, "breakfast", "Egg white omelette"), meal(4, "lunch", "Turkey and rice bowl"), meal(4, "snack", "Protein bar"), meal(4, "dinner", "Fish, quinoa, salad")] },
    { dayIndex: 5, label: "Easy day", calories: "2,200 kcal", meals: [meal(5, "breakfast", "Smoothie with oats"), meal(5, "lunch", "Chicken salad"), meal(5, "dinner", "Paneer and roti")] },
    { dayIndex: 6, label: "Rest day", calories: "2,000 kcal", meals: [meal(6, "breakfast", "Yoghurt and fruit"), meal(6, "lunch", "Lentil soup and bread"), meal(6, "dinner", "Omelette and salad")] },
  ],
};

const vegetarianDiet = {
  focus: "Vegetarian, high protein",
  summary: "Three days that rotate, built around dal, paneer and tofu.",
  days: [
    { dayIndex: 0, label: "Dal day", calories: "2,100 kcal", meals: [meal(0, "breakfast", "Poha with peanuts"), meal(0, "lunch", "Dal, rice, curd"), meal(0, "snack", "Roasted chana"), meal(0, "dinner", "Rajma and roti")] },
    { dayIndex: 1, label: "Paneer day", calories: "2,100 kcal", meals: [meal(1, "breakfast", "Besan chilla"), meal(1, "lunch", "Paneer bhurji and roti"), meal(1, "snack", "Buttermilk and almonds"), meal(1, "dinner", "Chole and rice")] },
    { dayIndex: 2, label: "Tofu day", calories: "2,100 kcal", meals: [meal(2, "breakfast", "Overnight oats"), meal(2, "lunch", "Tofu stir fry and noodles"), meal(2, "snack", "Fruit and peanut butter"), meal(2, "dinner", "Mixed vegetable khichdi")] },
  ],
};

/** `content` stays loose: the schemas above have already validated it. */
type PlanSeed = { title: string; description: string; type: "WORKOUT" | "DIET"; content: { days: unknown[] } };

/** Parsed through the real schemas, so a bad plan fails here rather than in the app. */
const PLANS: PlanSeed[] = [
  { title: `${DEMO_PREFIX}Upper / Lower Split`, description: `Four lifting days and two rest days (${MARKER})`, type: "WORKOUT", content: workoutContentSchema.parse(upperLower) },
  { title: `${DEMO_PREFIX}Push Pull Legs`, description: `Six days on, one off (${MARKER})`, type: "WORKOUT", content: workoutContentSchema.parse(pushPullLegs) },
  { title: `${DEMO_PREFIX}Full Body 3-Day`, description: `A three-day rotation with no rest day inside it (${MARKER})`, type: "WORKOUT", content: workoutContentSchema.parse(fullBody) },
  { title: `${DEMO_PREFIX}Training / Rest Day Calories`, description: `Calories that follow the training week (${MARKER})`, type: "DIET", content: dietContentSchema.parse(trainingRestDiet) },
  { title: `${DEMO_PREFIX}Vegetarian Rotation`, description: `Three vegetarian days on repeat (${MARKER})`, type: "DIET", content: dietContentSchema.parse(vegetarianDiet) },
];

/** The two that get assigned: the 7-day split and the calorie-split diet. */
const ASSIGNED_WORKOUT = PLANS[0]!.title;
const ASSIGNED_DIET = PLANS[3]!.title;

// ---------------------------------------------------------------------------
// The generated history — identical on every run
// ---------------------------------------------------------------------------

function today(): DateKey {
  return dateKeyOf(new Date());
}

/** The Monday on or before 30 days ago, so the cycle lands the same way every run. */
function cycleStart(): DateKey {
  const start = parseDateKey(addDays(today(), -HISTORY_DAYS));
  const back = (start.getUTCDay() + 6) % 7; // 0 = Monday
  return addDays(dateKeyOf(start), -back);
}

type WeightPoint = { date: DateKey; weightKg: number; photo: boolean };

/**
 * Thirty days from 72 kg to about 69.6 kg: daily noise, a plateau in the third
 * week, and a few days simply missing, because real weigh-ins look like that.
 */
function weightSeries(): WeightPoint[] {
  const random = mulberry32(20260924);
  const start = 72;
  const end = 69.6;
  const missing = new Set([23, 17, 9, 2]); // days ago that were never logged
  const plateauFrom = 16;
  const plateauTo = 12;
  const photoDays = new Set([27, 19, 11, 3]);

  const points: WeightPoint[] = [];
  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    if (missing.has(daysAgo)) continue;

    const progress = (HISTORY_DAYS - 1 - daysAgo) / (HISTORY_DAYS - 1);
    // The plateau holds the trend still for a few days before it resumes.
    const held = daysAgo <= plateauFrom && daysAgo >= plateauTo ? (HISTORY_DAYS - 1 - plateauFrom) / (HISTORY_DAYS - 1) : progress;
    const trend = start + (end - start) * held;
    const noise = (random() - 0.5) * 0.6;
    const weightKg = Math.min(MAX_WEIGHT_KG, Number((trend + noise).toFixed(1)));
    points.push({ date: addDays(today(), -daysAgo), weightKg, photo: photoDays.has(daysAgo) });
  }
  return points;
}

type Completion = "full" | "partial" | "missed";

/** Roughly half complete, a third partial, the rest not logged at all. */
function completionFor(date: DateKey, type: "WORKOUT" | "DIET"): Completion {
  const value = roll(`completion:${date}:${type}`);
  if (value < 0.5) return "full";
  if (value < 0.83) return "partial";
  return "missed";
}

/** Days ago whose diet check-in carries meal photos — fixed, so there are always four. */
const DIET_PHOTO_DAYS = [26, 18, 10, 4];

const CLIENT_NOTES = [
  "knee felt off on the last set, dropped the weight",
  "skipped dinner, was travelling",
  "best session in weeks, bench moved easily",
  "slept badly, kept everything light",
  "ate out for lunch so the numbers are a guess",
  "legs still sore from Monday",
];

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

async function findClient() {
  const client = await prisma.user.findUnique({ where: { email: CLIENT_EMAIL } });
  if (!client) {
    throw new Error(
      `No user with email ${CLIENT_EMAIL}. Creating a user in production should be deliberate — make the account first, then run this again.`,
    );
  }
  if (client.role !== "CLIENT") {
    throw new Error(`${CLIENT_EMAIL} has role ${client.role}, expected CLIENT. Refusing to touch it.`);
  }
  return client;
}

async function ensureCoach() {
  const existing = await prisma.user.findUnique({ where: { email: COACH_EMAIL }, include: { coachProfile: true } });
  if (usingOwnCoach) {
    if (!existing) throw new Error(`No user with email ${COACH_EMAIL} — check --coach.`);
    if (existing.role !== "COACH") throw new Error(`${COACH_EMAIL} has role ${existing.role}, expected COACH.`);
    say(`coach ${COACH_EMAIL}: existing account, left as it is`);
    return existing;
  }
  if (existing) {
    if (!existing.coachProfile) {
      say(`coach profile for ${COACH_EMAIL}: create`);
      if (!dryRun) {
        await prisma.coachProfile.create({
          data: { userId: existing.id, bio: `Demo coach account (${MARKER})`, specialties: ["Strength", "Nutrition"], yearsExperience: 7 },
        });
      }
    }
    const password = process.env.DEMO_COACH_PASSWORD;
    if (!dryRun && (existing.coachApprovalStatus !== "APPROVED" || (password && !existing.password))) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { coachApprovalStatus: "APPROVED", ...(password && !existing.password ? { password: await hashPassword(password) } : {}) },
      });
    }
    return existing;
  }

  const password = process.env.DEMO_COACH_PASSWORD;
  say(`coach ${COACH_EMAIL}: create (APPROVED, with profile${password ? ", with password" : ", no password"})`);
  if (dryRun) return null;
  return prisma.user.create({
    data: {
      email: COACH_EMAIL,
      name: "Demo Coach",
      role: "COACH",
      coachApprovalStatus: "APPROVED",
      // Only signable-into when DEMO_COACH_PASSWORD is set; otherwise this
      // account just owns the demo plans.
      ...(password ? { password: await hashPassword(password) } : {}),
      coachProfile: {
        create: { bio: `Demo coach account (${MARKER})`, specialties: ["Strength", "Nutrition"], yearsExperience: 7 },
      },
    },
  });
}

async function ensureInvite(coachId: string, client: { id: string; email: string }) {
  const existing = await prisma.coachClientInvite.findFirst({ where: { coachId, clientEmail: client.email } });
  if (usingOwnCoach) {
    if (existing?.status !== "ACCEPTED") {
      throw new Error(`${COACH_EMAIL} has no accepted invite with ${client.email}; plans can only be assigned through one.`);
    }
    say("invite: already accepted, left as it is");
    return existing;
  }
  if (existing) {
    if (existing.status !== "ACCEPTED" && !dryRun) {
      await prisma.coachClientInvite.update({
        where: { id: existing.id },
        data: { status: "ACCEPTED", clientId: client.id, respondedAt: parseDateKey(cycleStart()) },
      });
    }
    return existing;
  }
  say(`invite ${COACH_EMAIL} -> ${client.email}: create (ACCEPTED)`);
  if (dryRun) return null;
  return prisma.coachClientInvite.create({
    data: {
      coachId,
      clientEmail: client.email,
      clientId: client.id,
      status: "ACCEPTED",
      respondedAt: parseDateKey(cycleStart()),
    },
  });
}

async function ensureSubscription(coachId: string, clientId: string) {
  const existing = await prisma.subscription.findFirst({ where: { coachId, clientId, notes: { contains: MARKER } } });
  if (existing) return existing;
  if (usingOwnCoach) {
    const theirs = await prisma.subscription.findFirst({ where: { coachId, clientId } });
    if (theirs) {
      say("subscription: already there, left as it is");
      return theirs;
    }
  }
  const startDate = parseDateKey(addDays(today(), -30));
  const endDate = parseDateKey(addDays(today(), 60));
  say(`subscription: create (ACTIVE, ${dateKeyOf(startDate)} to ${dateKeyOf(endDate)})`);
  if (dryRun) return null;
  return prisma.subscription.create({
    data: { coachId, clientId, startDate, endDate, status: "ACTIVE", notes: `Demo subscription (${MARKER})` },
  });
}

async function ensurePlans(coachId: string) {
  const plans = [];
  for (const seed of PLANS) {
    const existing = await prisma.plan.findFirst({ where: { title: seed.title, createdById: coachId } });
    if (existing) {
      plans.push(existing);
      continue;
    }
    say(`plan "${seed.title}": create (${seed.content.days.length}-day cycle)`);
    if (dryRun) {
      plans.push({ ...seed, id: `dry-run-${seed.title}`, cycleLengthDays: seed.content.days.length } as never);
      continue;
    }
    plans.push(
      await prisma.plan.create({
        data: {
          type: seed.type,
          title: seed.title,
          description: seed.description,
          content: seed.content as unknown as Prisma.InputJsonValue,
          cycleLengthDays: seed.content.days.length,
          createdById: coachId,
          isDefault: false,
        },
      }),
    );
  }
  return plans;
}

/**
 * The service layer keeps one ACTIVE assignment per plan type; assigning here
 * would quietly make a second one, and the apps would disagree about which
 * plan is current. So an existing active plan is a stop, not something to
 * complete on the client's behalf.
 */
async function assertNoOtherActivePlan(clientId: string, type: "WORKOUT" | "DIET", ourPlanIds: string[]): Promise<void> {
  const clashes = await prisma.planAssignment.findMany({
    where: { clientId, status: "ACTIVE", planId: { notIn: ourPlanIds }, plan: { type } },
    include: { plan: { select: { title: true } } },
  });
  if (clashes.length === 0) return;
  const list = clashes.map((row) => `"${row.plan.title}" (${row.id})`).join(", ");

  if (!replaceActive) {
    throw new Error(
      `This client already has an ACTIVE ${type} plan: ${list}. Two active plans of one type is a state the app never creates, so this stops here — move the client off it in the coach app, or re-run with --replace-active.`,
    );
  }

  for (const row of clashes) {
    say(`assignment "${row.plan.title}" (${row.id}): ACTIVE -> COMPLETED`);
    console.log(`   to undo by hand: status ACTIVE, endDate ${row.endDate ? row.endDate.toISOString() : "null"}`);
  }
  if (!dryRun) {
    await prisma.planAssignment.updateMany({
      where: { id: { in: clashes.map((row) => row.id) } },
      data: { status: "COMPLETED", endDate: new Date() },
    });
  }
}

async function ensureAssignment(coachId: string, clientId: string, planId: string, planTitle: string) {
  const existing = await prisma.planAssignment.findFirst({ where: { coachId, clientId, planId } });
  if (existing) return existing;
  say(`assignment "${planTitle}": create (ACTIVE from ${cycleStart()})`);
  if (dryRun) return null;
  return prisma.planAssignment.create({
    data: { coachId, clientId, planId, status: "ACTIVE", startDate: parseDateKey(cycleStart()) },
  });
}

/** Files to upload, smallest first so the demo pulls the lighter images. */
async function assetFiles(kind: "physique" | "diet"): Promise<string[]> {
  const dir = path.join(assetsDir, kind);
  const names = (await readdir(dir)).filter((name) => /\.(jpe?g)$/i.test(name)).sort();
  return names.map((name) => path.join(dir, name));
}

async function uploadPhoto(userId: string, purpose: "weight" | "diet", file: string): Promise<string> {
  const key = buildObjectKey(userId, purpose, "image/jpeg");
  await putObject(key, await readFile(file), "image/jpeg");
  return key;
}

async function seed(): Promise<void> {
  const client = await findClient();
  say(`client ${client.email} (${client.id})`);

  const coach = await ensureCoach();
  const coachId = coach?.id ?? "dry-run-coach";
  await ensureInvite(coachId, client);
  await ensureSubscription(coachId, client.id);

  const plans = await ensurePlans(coachId);
  const workoutPlan = plans.find((plan) => plan.title === ASSIGNED_WORKOUT)!;
  const dietPlan = plans.find((plan) => plan.title === ASSIGNED_DIET)!;
  const ourPlanIds = plans.map((plan) => plan.id);
  await assertNoOtherActivePlan(client.id, "WORKOUT", ourPlanIds);
  await assertNoOtherActivePlan(client.id, "DIET", ourPlanIds);
  const workoutAssignment = await ensureAssignment(coachId, client.id, workoutPlan.id, workoutPlan.title);
  const dietAssignment = await ensureAssignment(coachId, client.id, dietPlan.id, dietPlan.title);

  const photosOn = isS3Configured();
  if (!photosOn) {
    console.warn("AWS is not configured (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET) — seeding everything except photos.");
  }
  const physique = photosOn ? await assetFiles("physique") : [];
  const dietShots = photosOn ? await assetFiles("diet") : [];

  // --- weights -------------------------------------------------------------
  const series = weightSeries();
  let weightsCreated = 0;
  let photoIndex = 0;
  for (const point of series) {
    const date = parseDateKey(point.date);
    const existing = await prisma.weightEntry.findUnique({ where: { clientId_date: { clientId: client.id, date } } });
    if (existing) continue;

    let photoKey: string | null = null;
    if (point.photo && physique.length > 0) {
      const file = physique[photoIndex % physique.length]!;
      photoIndex += 1;
      say(`weight ${point.date}: ${point.weightKg} kg with photo ${path.basename(file)}`);
      if (!dryRun) photoKey = await uploadPhoto(client.id, "weight", file);
    } else {
      say(`weight ${point.date}: ${point.weightKg} kg`);
    }
    if (!dryRun) {
      await prisma.weightEntry.create({ data: { clientId: client.id, date, weightKg: point.weightKg, photoKey } });
    }
    weightsCreated += 1;
  }

  // --- check-ins -----------------------------------------------------------
  const start = cycleStart();
  let checkInsCreated = 0;
  let noteIndex = 0;
  let dietPhotoIndex = 0;

  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const date = addDays(today(), -daysAgo);

    for (const [assignment, plan] of [
      [workoutAssignment, workoutPlan],
      [dietAssignment, dietPlan],
    ] as const) {
      const dayIndex = resolveDayIndex(date, start, plan.cycleLengthDays);
      const itemIds = dayItemIds(plan.type, plan.content, dayIndex);
      // A rest day has nothing to tick, and the apps read rest from the plan,
      // not from a row — so no check-in at all.
      if (itemIds.length === 0) continue;

      // A day you photographed your meals is a day you logged them.
      const dietPhotoDay = plan.type === "DIET" && dietShots.length > 0 && DIET_PHOTO_DAYS.includes(daysAgo);
      const completion = dietPhotoDay ? "full" : completionFor(date, plan.type);
      if (completion === "missed") continue;

      const completedItemIds =
        completion === "full" ? itemIds : itemIds.slice(0, Math.max(1, Math.floor(itemIds.length * 0.6)));

      const wantsNote = noteIndex < CLIENT_NOTES.length && roll(`note:${date}:${plan.type}`) < 0.2;
      const note = wantsNote ? CLIENT_NOTES[noteIndex++]! : null;

      const photoFile = dietPhotoDay ? dietShots[dietPhotoIndex++ % dietShots.length]! : null;

      // Nothing is uploaded or written for a check-in that is already there.
      const already = assignment
        ? await prisma.checkIn.findUnique({
            where: { assignmentId_date: { assignmentId: assignment.id, date: parseDateKey(date) } },
          })
        : null;
      if (already) continue;

      let photoKeys: Record<string, string> | null = null;
      if (photoFile) {
        say(`check-in ${date} ${plan.type}: photo on ${itemIds[0]} (${path.basename(photoFile)})`);
        if (!dryRun) photoKeys = { [itemIds[0]!]: await uploadPhoto(client.id, "diet", photoFile) };
      }

      if (!dryRun && assignment) {
        await prisma.checkIn.create({
          data: {
            assignmentId: assignment.id,
            date: parseDateKey(date),
            completedItemIds,
            // Every note carries the marker, so removal can prove it is ours.
            notes: note ? `${note} (${MARKER})` : `${MARKER}`,
            photoKeys: photoKeys as Prisma.InputJsonValue,
          },
        });
      }
      checkInsCreated += 1;
    }
  }

  say(`done: ${plans.length} plans, 2 assignments, ${weightsCreated} weight entries, ${checkInsCreated} check-ins`);
}

// ---------------------------------------------------------------------------
// Removal
// ---------------------------------------------------------------------------

async function remove(): Promise<void> {
  const client = await prisma.user.findUnique({ where: { email: CLIENT_EMAIL } });
  if (!client) {
    say(`no user ${CLIENT_EMAIL} — nothing to remove`);
    return;
  }
  const coach = await prisma.user.findUnique({ where: { email: COACH_EMAIL }, include: { coachProfile: true } });
  if (!coach) {
    say(`no coach ${COACH_EMAIL} — nothing to remove`);
    return;
  }

  const plans = await prisma.plan.findMany({ where: { createdById: coach.id, title: { startsWith: DEMO_PREFIX } } });
  const planIds = plans.map((plan) => plan.id);

  const assignments = await prisma.planAssignment.findMany({ where: { planId: { in: planIds } }, include: { checkIns: true } });
  const ours = assignments.filter((assignment) => assignment.clientId === client.id);
  const others = assignments.filter((assignment) => assignment.clientId !== client.id);

  // Keys to drop from S3 once their rows are gone.
  const keys: string[] = [];
  for (const assignment of ours) {
    for (const checkIn of assignment.checkIns) {
      const map = checkIn.photoKeys as Record<string, string> | null;
      if (map) keys.push(...Object.values(map));
    }
  }

  const series = weightSeries();
  const weights = await prisma.weightEntry.findMany({
    where: { clientId: client.id, date: { in: series.map((point) => parseDateKey(point.date)) } },
  });
  // Only an entry whose weight is exactly what this script generates for that
  // date — anything the client logged themselves is left alone.
  const ourWeights = weights.filter((entry) =>
    series.some((point) => point.date === dateKeyOf(entry.date) && Math.abs(point.weightKg - entry.weightKg) < 0.001),
  );
  keys.push(...ourWeights.map((entry) => entry.photoKey).filter((key): key is string => Boolean(key)));

  say(`check-ins: delete ${ours.reduce((total, assignment) => total + assignment.checkIns.length, 0)}`);
  say(`assignments: delete ${ours.length}`);
  say(`weight entries: delete ${ourWeights.length} of ${weights.length} in range`);
  say(`plans: delete ${planIds.length - new Set(others.map((assignment) => assignment.planId)).size} of ${planIds.length}`);
  say(`s3 objects: delete ${keys.length}`);
  if (others.length > 0) {
    say(`keeping ${new Set(others.map((a) => a.planId)).size} plan(s): another client is assigned to them`);
  }

  if (!dryRun) {
    // Check-ins go with their assignments (cascade), then the rest.
    await prisma.planAssignment.deleteMany({ where: { id: { in: ours.map((assignment) => assignment.id) } } });
    await prisma.weightEntry.deleteMany({ where: { id: { in: ourWeights.map((entry) => entry.id) } } });

    const keepPlanIds = new Set(others.map((assignment) => assignment.planId));
    await prisma.plan.deleteMany({ where: { id: { in: planIds.filter((id) => !keepPlanIds.has(id)) } } });

    // Only the ones this script made: a real coach's invite and subscription
    // are none of its business.
    await prisma.subscription.deleteMany({ where: { coachId: coach.id, clientId: client.id, notes: { contains: MARKER } } });
    if (!usingOwnCoach) {
      await prisma.coachClientInvite.deleteMany({ where: { coachId: coach.id, clientEmail: client.email } });
    }

    if (isS3Configured()) {
      for (const key of keys) await deleteObject(key);
    } else if (keys.length > 0) {
      console.warn(`AWS is not configured — ${keys.length} S3 object(s) left behind. Re-run --remove with credentials to drop them.`);
    }

    // The coach only goes if this script is all it ever had.
    const leftovers = await prisma.plan.count({ where: { createdById: coach.id } });
    const invites = await prisma.coachClientInvite.count({ where: { coachId: coach.id } });
    const isDemoCoach = coach.coachProfile?.bio?.includes(MARKER) ?? false;
    if (isDemoCoach && leftovers === 0 && invites === 0) {
      await prisma.user.delete({ where: { id: coach.id } });
      say(`coach ${COACH_EMAIL}: deleted`);
    } else {
      say(`coach ${COACH_EMAIL}: kept (${leftovers} plan(s), ${invites} invite(s) remain)`);
    }
  }
}

if (removing && dryRun) console.log("[dry run] --remove: nothing will be deleted");

await (removing ? remove() : seed());
await prisma.$disconnect();
