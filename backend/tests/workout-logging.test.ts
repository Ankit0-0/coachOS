import { afterAll, describe, expect, it } from "vitest";

import { api, cleanupUser, createAcceptedInvite, registerUser, type TestUser } from "./helpers.js";

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

/** Two days that both have a bench press, under different item ids, as the plan editor writes them. */
const TWO_DAY_CONTENT = {
  focus: "Strength",
  summary: "Upper and lower.",
  difficulty: "Intermediate",
  days: [
    {
      dayIndex: 0,
      label: "Upper",
      isRestDay: false,
      duration: "60 min",
      exercises: [
        { id: "d0-bench", name: "Bench press", note: "", sets: 3, reps: "8" },
        { id: "d0-row", name: "Barbell row", note: "", sets: 2, reps: "10" },
      ],
    },
    {
      dayIndex: 1,
      label: "Upper again",
      isRestDay: false,
      duration: "60 min",
      exercises: [{ id: "d1-bench", name: "bench press ", note: "", sets: 2, reps: "5" }],
    },
  ],
};

const users: string[] = [];

async function setup(prefix: string) {
  const coach = await registerUser("COACH", `${prefix}-coach`);
  const client = await registerUser("CLIENT", `${prefix}-client`);
  users.push(coach.id, client.id);
  await createAcceptedInvite(coach, client);
  const plan = await api
    .post("/v1/coach/plans")
    .set(auth(coach))
    .send({ type: "WORKOUT", title: "Strength", cycleLengthDays: 2, content: TWO_DAY_CONTENT });
  expect(plan.status).toBe(201);
  const assigned = await api
    .post("/v1/coach/assignments")
    .set(auth(coach))
    .send({ clientId: client.id, planId: plan.body.plan.id, startDate: "2026-09-01" });
  expect(assigned.status).toBe(201);
  const assignmentId = assigned.body.assignment.id as string;
  const save = (date: string, setLogs: Record<string, { weightKg: number | null; reps: number | null } | null>) =>
    api.post("/v1/tracking/checkin").set(auth(client)).send({ assignmentId, date, completedItemIds: Object.keys(setLogs), setLogs });
  return { coach, client, assignmentId, save };
}

afterAll(async () => {
  for (const id of users) await cleanupUser(id);
});

describe("set logs on a check-in", () => {
  it("merges one set at a time, and a null entry removes that set", async () => {
    const { client, assignmentId, save } = await setup("setlog-merge");

    await save("2026-09-01", { "d0-bench-set1": { weightKg: 60, reps: 8 } });
    await save("2026-09-01", { "d0-bench-set2": { weightKg: 62.5, reps: 6 } });
    const removed = await save("2026-09-01", { "d0-bench-set1": null });

    expect(removed.status).toBe(200);
    expect(removed.body.checkIn.setLogs).toEqual({ "d0-bench-set2": { weightKg: 62.5, reps: 6 } });
    const listed = await api
      .get(`/v1/tracking/checkin?assignmentId=${assignmentId}&from=2026-09-01&to=2026-09-01`)
      .set(auth(client));
    expect(listed.body.checkIns[0].setLogs).toEqual({ "d0-bench-set2": { weightKg: 62.5, reps: 6 } });
  });

  it("keeps a set with only reps (bodyweight), and drops one with neither number", async () => {
    const { save } = await setup("setlog-partial");

    const res = await save("2026-09-02", {
      "d0-row-set1": { weightKg: null, reps: 12 },
      "d0-row-set2": { weightKg: null, reps: null },
    });

    expect(res.body.checkIn.setLogs).toEqual({ "d0-row-set1": { weightKg: null, reps: 12 } });
  });

  it("refuses impossible numbers", async () => {
    const { save } = await setup("setlog-invalid");

    expect((await save("2026-09-03", { "d0-bench-set1": { weightKg: -5, reps: 8 } })).status).toBe(400);
    expect((await save("2026-09-03", { "d0-bench-set1": { weightKg: 60, reps: 7.5 } })).status).toBe(400);
    expect((await save("2026-09-03", { "d0-bench-set1": { weightKg: 5000, reps: 8 } })).status).toBe(400);
  });
});

describe("exercise history", () => {
  it("groups sets by exercise name across days, with each day's top set, volume and the best set", async () => {
    const { client, save } = await setup("history");
    await save("2026-09-01", {
      "d0-bench-set1": { weightKg: 60, reps: 8 },
      "d0-bench-set2": { weightKg: 62.5, reps: 6 },
      "d0-row-set1": { weightKg: 50, reps: 10 },
    });
    await save("2026-09-02", {
      "d1-bench-set1": { weightKg: 62.5, reps: 7 },
      "d1-bench-set2": { weightKg: 60, reps: 5 },
    });

    const res = await api.get("/v1/tracking/exercise-history?from=2026-09-01&to=2026-09-30").set(auth(client));

    expect(res.status).toBe(200);
    const bench = res.body.exercises.find((exercise: { name: string }) => exercise.name.toLowerCase() === "bench press");
    expect(bench.sessions).toEqual([
      {
        date: "2026-09-01",
        sets: [
          { weightKg: 60, reps: 8 },
          { weightKg: 62.5, reps: 6 },
        ],
        topSet: { weightKg: 62.5, reps: 6 },
        volumeKg: 855,
      },
      {
        date: "2026-09-02",
        sets: [
          { weightKg: 62.5, reps: 7 },
          { weightKg: 60, reps: 5 },
        ],
        topSet: { weightKg: 62.5, reps: 7 },
        volumeKg: 737.5,
      },
    ]);
    // Same weight, more reps: the later set is the best.
    expect(bench.best).toEqual({ weightKg: 62.5, reps: 7, date: "2026-09-02" });
    // Most recently trained first.
    expect(res.body.exercises.map((exercise: { name: string }) => exercise.name.toLowerCase())).toEqual([
      "bench press",
      "barbell row",
    ]);
  });

  it("leaves out sets whose exercise is no longer in the plan", async () => {
    const { client, save } = await setup("history-orphan");
    await save("2026-09-01", { "d0-gone-set1": { weightKg: 100, reps: 1 } });

    const res = await api.get("/v1/tracking/exercise-history?from=2026-09-01&to=2026-09-30").set(auth(client));

    expect(res.body.exercises).toEqual([]);
  });

  it("lets the client's coach read it, and no one else", async () => {
    const { coach, client, save } = await setup("history-coach");
    const stranger = await registerUser("COACH", "history-stranger");
    users.push(stranger.id);
    await save("2026-09-01", { "d0-bench-set1": { weightKg: 70, reps: 5 } });

    const mine = await api
      .get(`/v1/coach/clients/${client.id}/exercise-progress?from=2026-09-01&to=2026-09-30`)
      .set(auth(coach));
    expect(mine.status).toBe(200);
    expect(mine.body.exercises[0]).toMatchObject({ name: "Bench press", best: { weightKg: 70, reps: 5 } });

    expect(
      (await api.get(`/v1/coach/clients/${client.id}/exercise-progress?from=2026-09-01&to=2026-09-30`).set(auth(stranger)))
        .status,
    ).toBe(403);
    expect((await api.get(`/v1/coach/clients/${client.id}/exercise-progress`).set(auth(coach))).status).toBe(400);
  });
});
