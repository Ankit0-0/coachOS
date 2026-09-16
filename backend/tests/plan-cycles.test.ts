import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import { normalizePlanContent } from "../src/features/plan/content.js";
import { cycleStartDate, resolveDayIndex } from "../src/features/plan/schedule.js";
import { api, cleanupUser, createAcceptedInvite, registerUser, type TestUser } from "./helpers.js";

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

/** A workout plan shaped the way plans were stored before cycles existed. */
const LEGACY_WORKOUT = {
  duration: "42 min",
  focus: "Full body",
  summary: "Everything, once.",
  difficulty: "Moderate",
  exercises: [
    { id: "squat", name: "Back squat", note: "", sets: 3, reps: "8" },
    { id: "row", name: "Barbell row", note: "", sets: 2, reps: "10" },
  ],
};

const LEGACY_DIET = {
  calories: "2,000 kcal",
  focus: "Maintenance",
  summary: "Steady.",
  meals: [
    { id: "breakfast", label: "Oats" },
    { id: "dinner", label: "Salmon" },
  ],
};

/** A three-day cycle: two working days and a rest day in the middle. */
function cycleWorkout(days = 3) {
  return {
    focus: "Push pull rest",
    summary: "A short rotation.",
    difficulty: "Moderate",
    days: Array.from({ length: days }, (_, index) => {
      const isRestDay = index === 1;
      return {
        dayIndex: index,
        label: isRestDay ? "Rest" : index === 0 ? "Push" : "Pull",
        isRestDay,
        duration: isRestDay ? "" : "45 min",
        exercises: isRestDay ? [] : [{ id: `d${index}-bench`, name: "Bench press", note: "", sets: 3, reps: "8" }],
      };
    }),
  };
}

const run = promisify(execFile);
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Runs the real backfill script the way an operator would. */
function runBackfill() {
  return run(process.execPath, ["--import", "tsx", "scripts/backfill-plan-cycles.ts"], { cwd: backendRoot });
}

describe("plan cycles", () => {
  describe("normalizing legacy content", () => {
    it("reads a pre-cycle workout as a one-day cycle with its ids untouched", () => {
      const content = normalizePlanContent("WORKOUT", LEGACY_WORKOUT);
      expect(content.days).toHaveLength(1);
      const [day] = content.days;
      expect(day).toMatchObject({ dayIndex: 0, isRestDay: false, duration: "42 min" });
      expect("exercises" in day! ? day!.exercises.map((exercise) => exercise.id) : []).toEqual(["squat", "row"]);
      expect(content).toMatchObject({ focus: "Full body", summary: "Everything, once." });
    });

    it("reads a pre-cycle diet the same way", () => {
      const content = normalizePlanContent("DIET", LEGACY_DIET);
      expect(content.days).toHaveLength(1);
      const [day] = content.days;
      expect("meals" in day! ? day!.meals.map((meal) => meal.id) : []).toEqual(["breakfast", "dinner"]);
      expect("calories" in day! ? day!.calories : null).toBe("2,000 kcal");
    });

    it("leaves content that is already a cycle alone", () => {
      const content = normalizePlanContent("WORKOUT", cycleWorkout());
      expect(content.days).toHaveLength(3);
      expect(content.days.map((day) => day.dayIndex)).toEqual([0, 1, 2]);
      expect(content.days[1]).toMatchObject({ isRestDay: true, label: "Rest" });
    });
  });

  describe("resolving a date to a day of the cycle", () => {
    it("walks the cycle and wraps at the boundary", () => {
      expect(resolveDayIndex("2026-09-16", "2026-09-16", 7)).toBe(0);
      expect(resolveDayIndex("2026-09-18", "2026-09-16", 7)).toBe(2);
      expect(resolveDayIndex("2026-09-22", "2026-09-16", 7)).toBe(6);
      // Day 8 is day 1 again.
      expect(resolveDayIndex("2026-09-23", "2026-09-16", 7)).toBe(0);
      expect(resolveDayIndex("2026-10-14", "2026-09-16", 7)).toBe(0);
    });

    it("wraps backwards for a date before the assignment started", () => {
      expect(resolveDayIndex("2026-09-15", "2026-09-16", 7)).toBe(6);
      expect(resolveDayIndex("2026-09-09", "2026-09-16", 7)).toBe(0);
      expect(resolveDayIndex("2026-09-08", "2026-09-16", 7)).toBe(6);
    });

    it("treats a one-day plan as the same day forever", () => {
      expect(resolveDayIndex("2027-01-01", "2026-09-16", 1)).toBe(0);
    });

    it("falls back to the assignment date when startDate is null", () => {
      expect(cycleStartDate({ startDate: null, assignedAt: new Date("2026-09-16T18:30:00.000Z") })).toBe("2026-09-16");
      expect(
        cycleStartDate({ startDate: new Date("2026-09-14T00:00:00.000Z"), assignedAt: new Date("2026-09-16T00:00:00.000Z") }),
      ).toBe("2026-09-14");
    });
  });

  describe("validation", () => {
    let coach: TestUser;

    beforeAll(async () => {
      coach = await registerUser("COACH", "cyclevalid");
    });

    afterAll(async () => {
      await cleanupUser(coach.id);
    });

    function createPlan(body: Record<string, unknown>) {
      return api.post("/v1/coach/plans").set(auth(coach)).send(body);
    }

    it("accepts a cycle whose length matches its days", async () => {
      const res = await createPlan({ type: "WORKOUT", title: "Three day", cycleLengthDays: 3, content: cycleWorkout(3) });
      expect(res.status).toBe(201);
      expect(res.body.plan.cycleLengthDays).toBe(3);
      expect(res.body.plan.content.days).toHaveLength(3);
    });

    it("rejects a cycle length that disagrees with the days given", async () => {
      const res = await createPlan({ type: "WORKOUT", title: "Mismatch", cycleLengthDays: 7, content: cycleWorkout(3) });
      expect(res.status).toBe(400);
    });

    it("rejects day indexes that are not contiguous from zero", async () => {
      const content = cycleWorkout(2);
      content.days[1]!.dayIndex = 5;
      const res = await createPlan({ type: "WORKOUT", title: "Gappy", cycleLengthDays: 2, content });
      expect(res.status).toBe(400);
    });

    it("rejects two items sharing an id within a day", async () => {
      const content = cycleWorkout(1);
      content.days[0]!.exercises = [
        { id: "d0-bench", name: "Bench", note: "", sets: 3, reps: "8" },
        { id: "d0-bench", name: "Bench again", note: "", sets: 3, reps: "8" },
      ];
      const res = await createPlan({ type: "WORKOUT", title: "Clashing ids", cycleLengthDays: 1, content });
      expect(res.status).toBe(400);
    });

    it("allows the same exercise on different days, because the ids differ by day", async () => {
      const content = cycleWorkout(2);
      content.days[1]!.isRestDay = false;
      content.days[1]!.label = "Push again";
      content.days[1]!.duration = "45 min";
      content.days[1]!.exercises = [{ id: "d1-bench", name: "Bench press", note: "", sets: 3, reps: "8" }];
      const res = await createPlan({ type: "WORKOUT", title: "Repeat push", cycleLengthDays: 2, content });
      expect(res.status).toBe(201);
    });

    it("rejects a rest day carrying items", async () => {
      const content = cycleWorkout(2);
      content.days[1]!.exercises = [{ id: "d1-bench", name: "Bench", note: "", sets: 3, reps: "8" }];
      const res = await createPlan({ type: "WORKOUT", title: "Busy rest", cycleLengthDays: 2, content });
      expect(res.status).toBe(400);
    });

    it("rejects a working day with nothing in it", async () => {
      const content = cycleWorkout(2);
      content.days[0]!.exercises = [];
      const res = await createPlan({ type: "WORKOUT", title: "Empty day", cycleLengthDays: 2, content });
      expect(res.status).toBe(400);
    });

    it("rejects a cycle longer than 31 days", async () => {
      const res = await createPlan({ type: "WORKOUT", title: "Too long", cycleLengthDays: 32, content: cycleWorkout(32) });
      expect(res.status).toBe(400);
    });
  });

  describe("schedule endpoints", () => {
    let coach: TestUser;
    let otherCoach: TestUser;
    let client: TestUser;
    let otherClient: TestUser;
    const start = "2026-09-14";

    beforeAll(async () => {
      coach = await registerUser("COACH", "cyclecoach");
      otherCoach = await registerUser("COACH", "cycleother");
      client = await registerUser("CLIENT", "cycleclient");
      otherClient = await registerUser("CLIENT", "cycleotherclient");
      await createAcceptedInvite(coach, client);
      await createAcceptedInvite(otherCoach, otherClient);

      const plan = await api
        .post("/v1/coach/plans")
        .set(auth(coach))
        .send({ type: "WORKOUT", title: "Rotation", cycleLengthDays: 3, content: cycleWorkout(3) });
      expect(plan.status).toBe(201);

      const assigned = await api
        .post("/v1/coach/assignments")
        .set(auth(coach))
        .send({ clientId: client.id, planId: plan.body.plan.id, startDate: start });
      expect(assigned.status).toBe(201);
    });

    afterAll(async () => {
      for (const user of [coach, otherCoach, client, otherClient]) await cleanupUser(user.id);
    });

    it("gives the client a day per date, rotating through the cycle", async () => {
      const res = await api
        .get("/v1/client/schedule")
        .query({ from: start, to: "2026-09-20" })
        .set(auth(client));

      expect(res.status).toBe(200);
      const entries = res.body.schedule as { date: string; dayIndex: number; label: string; isRestDay: boolean; itemCount: number }[];
      expect(entries).toHaveLength(7);
      expect(entries.map((entry) => entry.dayIndex)).toEqual([0, 1, 2, 0, 1, 2, 0]);
      expect(entries.map((entry) => entry.label)).toEqual(["Push", "Rest", "Pull", "Push", "Rest", "Pull", "Push"]);
      // A rest day counts nothing; a working day counts one id per set.
      expect(entries[0]).toMatchObject({ isRestDay: false, itemCount: 3 });
      expect(entries[1]).toMatchObject({ isRestDay: true, itemCount: 0 });
    });

    it("hands the coach the same schedule for their own client", async () => {
      const res = await api
        .get(`/v1/coach/clients/${client.id}/schedule`)
        .query({ from: start, to: "2026-09-16" })
        .set(auth(coach));

      expect(res.status).toBe(200);
      expect((res.body.schedule as { dayIndex: number }[]).map((entry) => entry.dayIndex)).toEqual([0, 1, 2]);
    });

    it("refuses a coach who does not coach that client", async () => {
      const res = await api
        .get(`/v1/coach/clients/${client.id}/schedule`)
        .query({ from: start, to: "2026-09-16" })
        .set(auth(otherCoach));
      expect(res.status).toBe(403);
    });

    it("gives a client only their own schedule, never another's", async () => {
      const res = await api.get("/v1/client/schedule").query({ from: start, to: "2026-09-16" }).set(auth(otherClient));
      expect(res.status).toBe(200);
      expect(res.body.schedule).toEqual([]);

      // The coach route is coach-only, so a client cannot reach for it either.
      const viaCoachRoute = await api
        .get(`/v1/coach/clients/${client.id}/schedule`)
        .query({ from: start, to: "2026-09-16" })
        .set(auth(otherClient));
      expect(viaCoachRoute.status).toBe(403);
    });

    it("rejects a backwards or oversized range, and requires a token", async () => {
      expect((await api.get("/v1/client/schedule").query({ from: "2026-09-20", to: start }).set(auth(client))).status).toBe(400);
      expect((await api.get("/v1/client/schedule").query({ from: "2026-01-01", to: "2026-12-31" }).set(auth(client))).status).toBe(400);
      expect((await api.get("/v1/client/schedule").query({ from: start, to: start })).status).toBe(401);
    });
  });

  describe("the backfill script", () => {
    let coach: TestUser;
    let legacyId: string;
    let cycleId: string;

    beforeAll(async () => {
      coach = await registerUser("COACH", "cyclebackfill");
      const legacy = await prisma.plan.create({
        data: { type: "WORKOUT", title: "Backfill legacy", content: LEGACY_WORKOUT, createdById: coach.id },
      });
      legacyId = legacy.id;
      const cycle = await prisma.plan.create({
        data: { type: "WORKOUT", title: "Backfill cycle", content: cycleWorkout(3), cycleLengthDays: 3, createdById: coach.id },
      });
      cycleId = cycle.id;
    });

    afterAll(async () => {
      await prisma.plan.deleteMany({ where: { id: { in: [legacyId, cycleId] } } });
      await cleanupUser(coach.id);
    });

    it("converts a legacy row once and changes nothing on a second run", async () => {
      await runBackfill();

      const afterFirst = await prisma.plan.findUniqueOrThrow({ where: { id: legacyId } });
      const content = afterFirst.content as { days: { exercises: { id: string }[] }[] };
      expect(afterFirst.cycleLengthDays).toBe(1);
      expect(content.days).toHaveLength(1);
      // Ids are left exactly as they were: check-in rows point at them.
      expect(content.days[0]!.exercises.map((exercise) => exercise.id)).toEqual(["squat", "row"]);

      const untouchedBefore = await prisma.plan.findUniqueOrThrow({ where: { id: cycleId } });

      await runBackfill();

      const afterSecond = await prisma.plan.findUniqueOrThrow({ where: { id: legacyId } });
      expect(afterSecond.updatedAt.getTime()).toBe(afterFirst.updatedAt.getTime());
      expect(afterSecond.content).toEqual(afterFirst.content);

      const untouchedAfter = await prisma.plan.findUniqueOrThrow({ where: { id: cycleId } });
      expect(untouchedAfter.updatedAt.getTime()).toBe(untouchedBefore.updatedAt.getTime());
    }, 60_000);
  });

  describe("a client moved to a new plan", () => {
    let coach: TestUser;
    let client: TestUser;
    let firstPlanId: string;
    let secondPlanId: string;

    beforeAll(async () => {
      coach = await registerUser("COACH", "cycleswitch");
      client = await registerUser("CLIENT", "cycleswitchclient");
      await createAcceptedInvite(coach, client);

      const first = await api
        .post("/v1/coach/plans")
        .set(auth(coach))
        .send({ type: "WORKOUT", title: "First", cycleLengthDays: 3, content: cycleWorkout(3) });
      const second = await api
        .post("/v1/coach/plans")
        .set(auth(coach))
        .send({ type: "WORKOUT", title: "Second", cycleLengthDays: 2, content: cycleWorkout(2) });
      firstPlanId = first.body.plan.id;
      secondPlanId = second.body.plan.id;

      const firstAssignment = await api
        .post("/v1/coach/assignments")
        .set(auth(coach))
        .send({ clientId: client.id, planId: firstPlanId, startDate: "2026-08-01" });
      await api
        .post("/v1/coach/assignments")
        .set(auth(coach))
        .send({ clientId: client.id, planId: secondPlanId, startDate: "2026-09-10" });
      // Assigning completes the first plan as of "now"; pin its end so the
      // test does not depend on the clock.
      await prisma.planAssignment.update({
        where: { id: firstAssignment.body.assignment.id },
        data: { endDate: new Date("2026-09-09T00:00:00.000Z") },
      });
    });

    afterAll(async () => {
      await cleanupUser(coach.id);
      await cleanupUser(client.id);
    });

    it("resolves a past date against the plan that was assigned then", async () => {
      const res = await api
        .get("/v1/client/schedule")
        .query({ from: "2026-09-08", to: "2026-09-11" })
        .set(auth(client));

      expect(res.status).toBe(200);
      const entries = res.body.schedule as { date: string; title: string; dayIndex: number }[];
      // One workout per date, never both plans side by side.
      expect(entries.map((entry) => entry.date)).toEqual(["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11"]);
      expect(entries.map((entry) => entry.title)).toEqual(["First", "First", "Second", "Second"]);
      // Each counted from its own start: Aug 1 + 38 days is day 2 of 3; Sep 10 is day 0 of 2.
      expect(entries.map((entry) => entry.dayIndex)).toEqual([2, 0, 0, 1]);
    });

    it("tells the coach how many clients are on each of their plans", async () => {
      const second = await api.get(`/v1/coach/plans/${secondPlanId}`).set(auth(coach));
      const first = await api.get(`/v1/coach/plans/${firstPlanId}`).set(auth(coach));
      expect(second.body.plan.activeAssignmentCount).toBe(1);
      expect(first.body.plan.activeAssignmentCount).toBe(0);

      const list = await api.get("/v1/coach/plans").query({ type: "WORKOUT" }).set(auth(coach));
      const own = list.body.own as { id: string; activeAssignmentCount?: number }[];
      expect(own.find((plan) => plan.id === secondPlanId)?.activeAssignmentCount).toBe(1);
      // A default's count would be every coach's clients, so none is sent.
      for (const plan of list.body.defaults as Record<string, unknown>[]) {
        expect(plan).not.toHaveProperty("activeAssignmentCount");
      }
    });
  });

  describe("legacy plans in practice", () => {
    let coach: TestUser;
    let client: TestUser;
    let planId: string;

    beforeAll(async () => {
      coach = await registerUser("COACH", "cyclelegacy");
      client = await registerUser("CLIENT", "cyclelegacyclient");
      await createAcceptedInvite(coach, client);

      // Written straight to the database in the old shape, as an existing row is.
      const plan = await prisma.plan.create({
        data: { type: "WORKOUT", title: "Legacy plan", content: LEGACY_WORKOUT, createdById: coach.id },
      });
      planId = plan.id;
      await api.post("/v1/coach/assignments").set(auth(coach)).send({ clientId: client.id, planId });
    });

    afterAll(async () => {
      await prisma.plan.deleteMany({ where: { id: planId } });
      await cleanupUser(coach.id);
      await cleanupUser(client.id);
    });

    it("serves a legacy plan as a one-day cycle", async () => {
      const res = await api.get("/v1/coach/plans").query({ type: "WORKOUT" }).set(auth(coach));
      const plan = (res.body.own as { id: string; cycleLengthDays: number; content: { days: unknown[] } }[]).find(
        (row) => row.id === planId,
      );
      expect(plan).toMatchObject({ cycleLengthDays: 1 });
      expect(plan?.content.days).toHaveLength(1);
    });

    it("keeps its original item ids, so check-ins written against it still count", async () => {
      const assignments = await api.get("/v1/tracking/assignments").set(auth(client));
      const assignment = (assignments.body.assignments as { id: string; planId: string }[]).find(
        (row) => row.planId === planId,
      );
      expect(assignment).toBeDefined();

      const saved = await api
        .post("/v1/tracking/checkin")
        .set(auth(client))
        .send({ assignmentId: assignment!.id, date: "2026-09-16", completedItemIds: ["squat-set1", "row-set2"] });
      expect(saved.status).toBe(200);

      const schedule = await api
        .get("/v1/client/schedule")
        .query({ from: "2026-09-16", to: "2026-09-16" })
        .set(auth(client));
      const entry = (schedule.body.schedule as { itemIds: string[]; dayIndex: number }[])[0]!;
      expect(entry.dayIndex).toBe(0);
      expect(entry.itemIds).toContain("squat-set1");
      expect(entry.itemIds).toContain("row-set2");
    });
  });
});
