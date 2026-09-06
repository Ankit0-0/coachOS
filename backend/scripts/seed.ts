import type { PlanType } from "@prisma/client";

import { prisma } from "../src/config/prisma.config.js";
import { hashPassword } from "../src/utils/password.js";

const PASSWORD = "password123";

// ---------------------------------------------------------------------------
// Plan content — these shapes are what the apps render, so they must match the
// WORKOUT / DIET content contracts exactly.
// ---------------------------------------------------------------------------

type WorkoutContent = {
  duration: string;
  focus: string;
  summary: string;
  difficulty: string;
  exercises: { id: string; name: string; note: string; sets: number }[];
};

type DietContent = {
  calories: string;
  focus: string;
  summary: string;
  meals: { id: string; label: string }[];
};

const DEFAULT_WORKOUT: WorkoutContent = {
  duration: "42 min",
  focus: "Build controlled strength through legs, glutes, and trunk.",
  summary: "Strength-focused lower-body work with controlled tempo and short recovery blocks.",
  difficulty: "Intermediate",
  exercises: [
    { id: "goblet-squat", name: "Goblet squat", note: "Keep ribs stacked and pause at the bottom.", sets: 4 },
    { id: "reverse-lunge", name: "Reverse lunge", note: "Step back softly, front knee over toes.", sets: 3 },
    { id: "hip-bridge", name: "Hip bridge", note: "Drive through heels, hold the top for one second.", sets: 3 },
    { id: "core-finisher", name: "Core finisher", note: "Move slowly, stop if the lower back takes over.", sets: 2 },
  ],
};

const DEFAULT_DIET: DietContent = {
  calories: "1,950 kcal",
  focus: "Keep protein high and place most carbs around the workout.",
  summary: "A high-protein split with steady carbs and recovery-friendly fats.",
  meals: [
    { id: "breakfast", label: "Breakfast: eggs, toast, fruit" },
    { id: "lunch", label: "Lunch: chicken rice bowl" },
    { id: "snack", label: "Snack: Greek yogurt and berries" },
    { id: "dinner", label: "Dinner: salmon, potatoes, greens" },
    { id: "hydration", label: "Hydration: 2.5L water" },
  ],
};

const UPPER_PUSH: WorkoutContent = {
  duration: "38 min",
  focus: "Press strength through chest, shoulders, and triceps.",
  summary: "Compound pressing followed by shoulder health accessories.",
  difficulty: "Intermediate",
  exercises: [
    { id: "bench-press", name: "Barbell bench press", note: "Elbows at 45 degrees, full lockout.", sets: 5 },
    { id: "incline-db", name: "Incline dumbbell press", note: "Control the descent for three seconds.", sets: 3 },
    { id: "lateral-raise", name: "Lateral raise", note: "Lead with the elbow, no swinging.", sets: 3 },
    { id: "tricep-pushdown", name: "Tricep pushdown", note: "Lock the elbows to your sides.", sets: 3 },
  ],
};

const CONDITIONING: WorkoutContent = {
  duration: "24 min",
  focus: "Raise work capacity without wrecking tomorrow's session.",
  summary: "Short intervals with strict rest — quality over grinding.",
  difficulty: "Beginner",
  exercises: [
    { id: "row-intervals", name: "Rower intervals", note: "250m hard, 90 seconds easy.", sets: 6 },
    { id: "kb-swing", name: "Kettlebell swing", note: "Snap the hips, the arms are just hooks.", sets: 4 },
    { id: "carry", name: "Farmer carry", note: "Tall posture, 40m per trip.", sets: 3 },
  ],
};

const CUTTING_DIET: DietContent = {
  calories: "1,700 kcal",
  focus: "Protect muscle in a deficit by keeping protein and steps high.",
  summary: "Lean protein at every meal with vegetables for volume.",
  meals: [
    { id: "breakfast", label: "Breakfast: egg whites, oats, blueberries" },
    { id: "lunch", label: "Lunch: turkey salad, olive oil dressing" },
    { id: "snack", label: "Snack: cottage cheese and an apple" },
    { id: "dinner", label: "Dinner: white fish, quinoa, broccoli" },
  ],
};

const MAINTENANCE_DIET: DietContent = {
  calories: "2,400 kcal",
  focus: "Hold weight steady while training hard four days a week.",
  summary: "Balanced plates with carbs timed around training.",
  meals: [
    { id: "breakfast", label: "Breakfast: oats, whey, banana" },
    { id: "lunch", label: "Lunch: beef and rice bowl" },
    { id: "snack", label: "Snack: trail mix and yogurt" },
    { id: "dinner", label: "Dinner: chicken pasta, side salad" },
    { id: "supper", label: "Before bed: casein or milk" },
  ],
};

const VEGETARIAN_DIET: DietContent = {
  calories: "2,100 kcal",
  focus: "Hit protein targets on a meat-free plan.",
  summary: "Legume- and dairy-forward meals with complete protein pairings.",
  meals: [
    { id: "breakfast", label: "Breakfast: tofu scramble, sourdough" },
    { id: "lunch", label: "Lunch: lentil and halloumi bowl" },
    { id: "snack", label: "Snack: edamame and a pear" },
    { id: "dinner", label: "Dinner: chickpea curry, brown rice" },
  ],
};

// ---------------------------------------------------------------------------
// Helpers — every step is idempotent so the script can be re-run safely.
// ---------------------------------------------------------------------------

function dayAt(daysAgo: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date;
}

async function ensureUser(email: string, name: string, role: "COACH" | "CLIENT") {
  return prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, name, role, password: await hashPassword(PASSWORD) },
  });
}

async function ensureCoachProfile(
  userId: string,
  data: { bio: string; specialties: string[]; yearsExperience: number; phone: string },
) {
  return prisma.coachProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

async function ensureClientProfile(
  userId: string,
  data: { heightCm: number; weightKg: number; goals: string },
) {
  return prisma.clientProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

async function ensurePlan(
  id: string,
  input: {
    type: PlanType;
    title: string;
    description: string;
    content: WorkoutContent | DietContent;
    isDefault?: boolean;
    createdById: string;
  },
) {
  const { isDefault = false, ...rest } = input;
  return prisma.plan.upsert({
    where: { id },
    update: { title: rest.title, description: rest.description, content: rest.content, createdById: rest.createdById },
    create: { id, ...rest, isDefault },
  });
}

async function ensureInvite(
  coachId: string,
  clientEmail: string,
  clientId: string,
  status: "ACCEPTED" | "PENDING",
  respondedDaysAgo?: number,
) {
  const existing = await prisma.coachClientInvite.findFirst({ where: { coachId, clientEmail } });
  if (existing) return existing;
  return prisma.coachClientInvite.create({
    data: {
      coachId,
      clientEmail,
      // A PENDING invite is only matched by email until the client accepts.
      clientId: status === "ACCEPTED" ? clientId : null,
      status,
      respondedAt: status === "ACCEPTED" ? dayAt(respondedDaysAgo ?? 30) : null,
    },
  });
}

async function ensureAssignment(coachId: string, clientId: string, planId: string, startedDaysAgo: number) {
  const existing = await prisma.planAssignment.findFirst({ where: { coachId, clientId, planId } });
  if (existing) return existing;
  return prisma.planAssignment.create({
    data: { coachId, clientId, planId, status: "ACTIVE", startDate: dayAt(startedDaysAgo) },
  });
}

async function ensureWeightSeries(clientId: string, start: number, deltaPerEntry: number, days: number[]) {
  for (const [index, daysAgo] of days.entries()) {
    const date = dayAt(daysAgo);
    const weightKg = Number((start + deltaPerEntry * index).toFixed(1));
    await prisma.weightEntry.upsert({
      where: { clientId_date: { clientId, date } },
      update: { weightKg },
      create: { clientId, date, weightKg },
    });
  }
}

async function ensureCheckIn(
  assignmentId: string,
  daysAgo: number,
  completedItemIds: string[],
  notes: string | null,
) {
  const date = dayAt(daysAgo);
  return prisma.checkIn.upsert({
    where: { assignmentId_date: { assignmentId, date } },
    update: { completedItemIds, notes },
    create: { assignmentId, date, completedItemIds, notes },
  });
}

function workoutItemIds(content: WorkoutContent, exercisesDone: number): string[] {
  return content.exercises.slice(0, exercisesDone).flatMap((exercise) =>
    Array.from({ length: exercise.sets }, (_, index) => `${exercise.id}-set${index + 1}`),
  );
}

// ---------------------------------------------------------------------------

async function main() {
  // --- Coaches -------------------------------------------------------------
  const marcus = await ensureUser("coach@coachos.dev", "Marcus Bell", "COACH");
  await ensureCoachProfile(marcus.id, {
    bio: "Barbell-first strength coach. I work with lifters who want to get strong without living in the gym.",
    specialties: ["Strength", "Powerlifting", "Return to training"],
    yearsExperience: 9,
    phone: "+1 555 0182",
  });

  const nina = await ensureUser("nina@coachos.dev", "Nina Alvarez", "COACH");
  await ensureCoachProfile(nina.id, {
    bio: "Nutrition-led coaching for busy people. Plans you can actually cook on a Tuesday night.",
    specialties: ["Nutrition", "Body recomposition"],
    yearsExperience: 5,
    phone: "+1 555 0147",
  });

  // Kept from the original seed so existing logins and default plans still work.
  const demoCoach = await ensureUser("demo.coach@example.com", "Demo Coach", "COACH");

  // --- Default (shared) plans ---------------------------------------------
  const defaultWorkout = await ensurePlan("demo-workout-plan", {
    type: "WORKOUT",
    title: "Lower body strength",
    description: "Strength-focused lower-body work with controlled tempo and short recovery blocks.",
    content: DEFAULT_WORKOUT,
    isDefault: true,
    createdById: demoCoach.id,
  });
  const defaultDiet = await ensurePlan("demo-diet-plan", {
    type: "DIET",
    title: "Balanced training day",
    description: "A high-protein split with steady carbs and recovery-friendly fats.",
    content: DEFAULT_DIET,
    isDefault: true,
    createdById: demoCoach.id,
  });

  // --- Coach-owned plans ---------------------------------------------------
  const upperPush = await ensurePlan("seed-plan-upper-push", {
    type: "WORKOUT",
    title: "Upper body push",
    description: "Compound pressing followed by shoulder health accessories.",
    content: UPPER_PUSH,
    createdById: marcus.id,
  });
  const conditioning = await ensurePlan("seed-plan-conditioning", {
    type: "WORKOUT",
    title: "Conditioning intervals",
    description: "Short intervals with strict rest — quality over grinding.",
    content: CONDITIONING,
    createdById: marcus.id,
  });
  const cutting = await ensurePlan("seed-plan-cutting", {
    type: "DIET",
    title: "Lean phase",
    description: "Lean protein at every meal with vegetables for volume.",
    content: CUTTING_DIET,
    createdById: marcus.id,
  });
  const maintenance = await ensurePlan("seed-plan-maintenance", {
    type: "DIET",
    title: "Maintenance",
    description: "Balanced plates with carbs timed around training.",
    content: MAINTENANCE_DIET,
    createdById: nina.id,
  });
  const vegetarian = await ensurePlan("seed-plan-vegetarian", {
    type: "DIET",
    title: "Vegetarian high protein",
    description: "Legume- and dairy-forward meals with complete protein pairings.",
    content: VEGETARIAN_DIET,
    createdById: nina.id,
  });

  // --- Clients -------------------------------------------------------------
  const jordan = await ensureUser("client@coachos.dev", "Jordan Reyes", "CLIENT");
  await ensureClientProfile(jordan.id, {
    heightCm: 178,
    weightKg: 82.4,
    goals: "Squat 140kg and drop to 78kg without losing strength.",
  });

  const sam = await ensureUser("sam@coachos.dev", "Sam Okafor", "CLIENT");
  await ensureClientProfile(sam.id, {
    heightCm: 185,
    weightKg: 95.1,
    goals: "Rebuild after a shoulder injury. Pain-free pressing first.",
  });

  const priya = await ensureUser("priya@coachos.dev", "Priya Nair", "CLIENT");
  await ensureClientProfile(priya.id, {
    heightCm: 164,
    weightKg: 61.0,
    goals: "Train three times a week around shift work.",
  });

  const leo = await ensureUser("leo@coachos.dev", "Leo Fischer", "CLIENT");
  await ensureClientProfile(leo.id, {
    heightCm: 172,
    weightKg: 70.2,
    goals: "Eat enough protein on a vegetarian diet.",
  });

  // No profile and no accepted invite — exercises the empty/locked states.
  const tara = await ensureUser("tara@coachos.dev", "Tara Vance", "CLIENT");

  const demoClient = await ensureUser("demo.client@example.com", "Demo Client", "CLIENT");

  // --- Coach ↔ client links -----------------------------------------------
  await ensureInvite(marcus.id, jordan.email, jordan.id, "ACCEPTED", 96);
  await ensureInvite(marcus.id, sam.email, sam.id, "ACCEPTED", 54);
  await ensureInvite(marcus.id, priya.email, priya.id, "ACCEPTED", 12);
  await ensureInvite(marcus.id, tara.email, tara.id, "PENDING");
  await ensureInvite(nina.id, leo.email, leo.id, "ACCEPTED", 33);
  // The original demo pair had assignments but was never actually linked.
  await ensureInvite(demoCoach.id, demoClient.email, demoClient.id, "ACCEPTED", 20);

  // --- Assignments ---------------------------------------------------------
  const jordanWorkout = await ensureAssignment(marcus.id, jordan.id, upperPush.id, 21);
  const jordanDiet = await ensureAssignment(marcus.id, jordan.id, cutting.id, 21);
  const samWorkout = await ensureAssignment(marcus.id, sam.id, conditioning.id, 14);
  await ensureAssignment(marcus.id, sam.id, defaultDiet.id, 14);
  await ensureAssignment(marcus.id, priya.id, defaultWorkout.id, 9);
  await ensureAssignment(nina.id, leo.id, vegetarian.id, 25);
  await ensureAssignment(demoCoach.id, demoClient.id, defaultWorkout.id, 20);
  await ensureAssignment(demoCoach.id, demoClient.id, defaultDiet.id, 20);

  // --- Progress data -------------------------------------------------------
  // Jordan: three weeks of steady weight loss plus logged sessions and notes.
  await ensureWeightSeries(jordan.id, 84.6, -0.35, [20, 17, 14, 11, 8, 5, 2, 0]);
  await ensureWeightSeries(sam.id, 95.8, -0.2, [12, 9, 6, 3, 0]);
  await ensureWeightSeries(leo.id, 69.4, 0.15, [15, 10, 5, 0]);

  await ensureCheckIn(jordanWorkout.id, 8, workoutItemIds(UPPER_PUSH, 4), "Bench felt heavy but all sets moved.");
  await ensureCheckIn(jordanWorkout.id, 6, workoutItemIds(UPPER_PUSH, 3), null);
  await ensureCheckIn(jordanWorkout.id, 4, workoutItemIds(UPPER_PUSH, 4), "Added 2.5kg to the top set, no shoulder pain.");
  await ensureCheckIn(jordanWorkout.id, 2, workoutItemIds(UPPER_PUSH, 2), "Short on time — got the pressing in, skipped accessories.");
  await ensureCheckIn(jordanWorkout.id, 0, workoutItemIds(UPPER_PUSH, 4), "Best session in weeks. Ready to push next week.");

  await ensureCheckIn(jordanDiet.id, 4, ["breakfast", "lunch", "dinner"], "Missed the afternoon snack again, work ran over.");
  await ensureCheckIn(jordanDiet.id, 2, ["breakfast", "lunch", "snack", "dinner"], null);
  await ensureCheckIn(jordanDiet.id, 0, ["breakfast", "lunch", "snack", "dinner"], "Meal prepped Sunday, much easier to stay on target.");

  await ensureCheckIn(samWorkout.id, 3, workoutItemIds(CONDITIONING, 2), "Rower intervals only, shoulder still grumbling on carries.");
  await ensureCheckIn(samWorkout.id, 1, workoutItemIds(CONDITIONING, 3), null);

  console.log("\nSeed complete. All accounts use the password: " + PASSWORD + "\n");
  console.table([
    { role: "COACH", name: "Marcus Bell", email: marcus.email, notes: "3 clients, 1 pending invite, 4 own plans" },
    { role: "COACH", name: "Nina Alvarez", email: nina.email, notes: "1 client, 2 own plans" },
    { role: "COACH", name: "Demo Coach", email: demoCoach.email, notes: "owns the two shared default plans" },
    { role: "CLIENT", name: "Jordan Reyes", email: jordan.email, notes: "richest data: weights, check-ins, notes" },
    { role: "CLIENT", name: "Sam Okafor", email: sam.email, notes: "some weights and check-ins" },
    { role: "CLIENT", name: "Priya Nair", email: priya.email, notes: "workout plan only, no tracking yet" },
    { role: "CLIENT", name: "Leo Fischer", email: leo.email, notes: "Nina's client" },
    { role: "CLIENT", name: "Tara Vance", email: tara.email, notes: "pending invite — app stays locked" },
    { role: "CLIENT", name: "Demo Client", email: demoClient.email, notes: "original demo pair" },
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
