import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { api, cleanupUser, registerUser, VALID_WORKOUT_CONTENT, type TestUser } from "./helpers.js";

describe("workout exercise reps and rest", () => {
  let coach: TestUser;

  beforeAll(async () => {
    coach = await registerUser("COACH", "repscoach");
  });

  afterAll(async () => {
    await cleanupUser(coach.id);
  });

  /** One day of the cycle, holding whichever exercises a test is checking. */
  function contentWith(exercises: unknown[]) {
    return {
      ...VALID_WORKOUT_CONTENT,
      days: [{ ...VALID_WORKOUT_CONTENT.days[0], exercises }],
    };
  }

  async function createPlan(exercises: unknown[]) {
    return api
      .post("/v1/coach/plans")
      .set("Authorization", `Bearer ${coach.token}`)
      .send({
        type: "WORKOUT",
        title: `Plan ${Math.random().toString(36).slice(2, 8)}`,
        cycleLengthDays: 1,
        content: contentWith(exercises),
      });
  }

  /** The first day's exercises, which is where a one-day plan keeps them. */
  function exercisesOf(plan: { content: { days: { exercises: Record<string, unknown>[] }[] } }) {
    return plan.content.days[0]!.exercises;
  }

  it("round-trips reps and rest through create and read back", async () => {
    const created = await createPlan([
      { id: "back-squat", name: "Back Squat", note: "Brace hard", sets: 4, reps: "8-10", rest: "90s" },
    ]);
    expect(created.status).toBe(201);

    const read = await api
      .get(`/v1/coach/plans/${created.body.plan.id}`)
      .set("Authorization", `Bearer ${coach.token}`);

    expect(read.status).toBe(200);
    expect(exercisesOf(read.body.plan)[0]!.reps).toBe("8-10");
    expect(exercisesOf(read.body.plan)[0]!.rest).toBe("90s");
  });

  it("accepts an exercise with neither field, so older plans still validate", async () => {
    const created = await createPlan([{ id: "push-up", name: "Push Up", note: "", sets: 3 }]);

    expect(created.status).toBe(201);
    expect(exercisesOf(created.body.plan)[0]!.reps).toBeUndefined();
    expect(exercisesOf(created.body.plan)[0]!.rest).toBeUndefined();
  });

  it("persists reps and rest added by a later update", async () => {
    const created = await createPlan([{ id: "row", name: "Row", note: "", sets: 3 }]);
    const planId = created.body.plan.id as string;

    const updated = await api
      .patch(`/v1/coach/plans/${planId}`)
      .set("Authorization", `Bearer ${coach.token}`)
      .send({
        cycleLengthDays: 1,
        content: contentWith([{ id: "row", name: "Row", note: "", sets: 3, reps: "12", rest: "60s" }]),
      });

    expect(updated.status).toBe(200);

    const read = await api.get(`/v1/coach/plans/${planId}`).set("Authorization", `Bearer ${coach.token}`);
    expect(exercisesOf(read.body.plan)[0]!.reps).toBe("12");
    expect(exercisesOf(read.body.plan)[0]!.rest).toBe("60s");
  });

  it("rejects a reps value longer than the 50-character limit", async () => {
    const created = await createPlan([
      { id: "row", name: "Row", note: "", sets: 3, reps: "x".repeat(51) },
    ]);

    expect(created.status).toBe(400);
  });

  it("keeps the exercise id the coach sent, so past check-ins stay matched", async () => {
    const created = await createPlan([
      { id: "original-id", name: "Renamed Later", note: "", sets: 3, reps: "5" },
    ]);
    const planId = created.body.plan.id as string;

    await api
      .patch(`/v1/coach/plans/${planId}`)
      .set("Authorization", `Bearer ${coach.token}`)
      .send({
        cycleLengthDays: 1,
        content: contentWith([{ id: "original-id", name: "A Completely New Name", note: "", sets: 3, reps: "5" }]),
      });

    const read = await api.get(`/v1/coach/plans/${planId}`).set("Authorization", `Bearer ${coach.token}`);
    expect(exercisesOf(read.body.plan)[0]!.id).toBe("original-id");
    expect(exercisesOf(read.body.plan)[0]!.name).toBe("A Completely New Name");
  });
});
