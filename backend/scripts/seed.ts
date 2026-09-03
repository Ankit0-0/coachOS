import { prisma } from "../src/config/prisma.config.js";
import { hashPassword } from "../src/utils/password.js";

const WORKOUT_PLAN = {
  title: "Lower body strength",
  description: "Strength-focused lower-body work with controlled tempo and short recovery blocks.",
  content: {
    duration: "42 min",
    focus: "Build controlled strength through legs, glutes, and trunk.",
    summary: "Strength-focused lower-body work with controlled tempo and short recovery blocks.",
    difficulty: "Intermediate",
    exercises: [
      {
        id: "goblet-squat",
        name: "Goblet squat",
        note: "Keep ribs stacked and pause for control at the bottom.",
        sets: 4,
      },
      {
        id: "reverse-lunge",
        name: "Reverse lunge",
        note: "Step back softly and keep the front knee tracking over toes.",
        sets: 3,
      },
      {
        id: "hip-bridge",
        name: "Hip bridge",
        note: "Drive through heels and hold the top position for one second.",
        sets: 3,
      },
      {
        id: "core-finisher",
        name: "Core finisher",
        note: "Move slowly and stop if your lower back takes over.",
        sets: 2,
      },
    ],
  },
};

const DIET_PLAN = {
  title: "Balanced training day",
  description: "A high-protein split with steady carbs and recovery-friendly fats.",
  content: {
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
  },
};

async function main() {
  const coach = await prisma.user.upsert({
    where: { email: "demo.coach@example.com" },
    update: { role: "COACH" },
    create: {
      email: "demo.coach@example.com",
      name: "Demo Coach",
      role: "COACH",
      password: await hashPassword("password123"),
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "demo.client@example.com" },
    update: { role: "CLIENT" },
    create: {
      email: "demo.client@example.com",
      name: "Demo Client",
      role: "CLIENT",
      password: await hashPassword("password123"),
    },
  });

  const workoutPlan = await prisma.plan.upsert({
    where: { id: "demo-workout-plan" },
    update: {
      title: WORKOUT_PLAN.title,
      description: WORKOUT_PLAN.description,
      content: WORKOUT_PLAN.content,
      createdById: coach.id,
    },
    create: {
      id: "demo-workout-plan",
      type: "WORKOUT",
      title: WORKOUT_PLAN.title,
      description: WORKOUT_PLAN.description,
      content: WORKOUT_PLAN.content,
      isDefault: true,
      createdById: coach.id,
    },
  });

  const dietPlan = await prisma.plan.upsert({
    where: { id: "demo-diet-plan" },
    update: {
      title: DIET_PLAN.title,
      description: DIET_PLAN.description,
      content: DIET_PLAN.content,
      createdById: coach.id,
    },
    create: {
      id: "demo-diet-plan",
      type: "DIET",
      title: DIET_PLAN.title,
      description: DIET_PLAN.description,
      content: DIET_PLAN.content,
      isDefault: true,
      createdById: coach.id,
    },
  });

  const ensureAssignment = async (planId: string, planType: "WORKOUT" | "DIET") => {
    const existing = await prisma.planAssignment.findFirst({
      where: { planId, clientId: client.id, coachId: coach.id },
    });
    if (existing) return existing;
    return prisma.planAssignment.create({
      data: {
        planId,
        coachId: coach.id,
        clientId: client.id,
        status: "ACTIVE",
        startDate: new Date("2026-08-15T00:00:00.000Z"),
      },
    });
  };

  const workoutAssignment = await ensureAssignment(workoutPlan.id, "WORKOUT");
  const dietAssignment = await ensureAssignment(dietPlan.id, "DIET");

  console.log(
    JSON.stringify(
      {
        coach: { id: coach.id, email: coach.email },
        client: { id: client.id, email: client.email },
        workoutPlanId: workoutPlan.id,
        dietPlanId: dietPlan.id,
        workoutAssignmentId: workoutAssignment.id,
        dietAssignmentId: dietAssignment.id,
      },
      null,
      2,
    ),
  );
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
