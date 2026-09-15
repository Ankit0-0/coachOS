import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  api,
  cleanupUser,
  createAcceptedInvite,
  registerUser,
  VALID_WORKOUT_CONTENT,
  type TestUser,
} from "./helpers.js";

/**
 * WeightEntry.date and CheckIn.date are calendar dates, not instants. Whatever
 * YYYY-MM-DD goes in must come back as the same YYYY-MM-DD from every read,
 * whatever timezone the server process runs in — a date that slides a day
 * either way means "today's" entry never matches the app's today.
 *
 * Node applies a runtime change to process.env.TZ, so each block below really
 * runs the server code in that zone: the far east and far west of the clock,
 * India (where the clients are) and UTC (where Render runs).
 */
const TIMEZONES = ["Pacific/Kiritimati", "Pacific/Pago_Pago", "Asia/Kolkata", "UTC"];

// Year and month boundaries are where an off-by-one shift shows up first.
const DATES = ["2026-01-01", "2026-03-31", "2026-09-15", "2026-12-31"];

describe.each(TIMEZONES)("tracking dates round-trip as calendar dates, server in %s", (timezone) => {
  let coach: TestUser;
  let client: TestUser;
  let assignmentId: string;
  const originalTimezone = process.env.TZ;

  beforeAll(async () => {
    process.env.TZ = timezone;
    coach = await registerUser("COACH", "dtcoach");
    client = await registerUser("CLIENT", "dtclient");
    await createAcceptedInvite(coach, client);
    const plan = await api
      .post("/v1/coach/plans")
      .set("Authorization", `Bearer ${coach.token}`)
      .send({ type: "WORKOUT", title: "Dates plan", content: VALID_WORKOUT_CONTENT });
    const assignment = await api
      .post("/v1/coach/assignments")
      .set("Authorization", `Bearer ${coach.token}`)
      .send({ clientId: client.id, planId: plan.body.plan.id });
    assignmentId = assignment.body.assignment.id;
  });

  afterAll(async () => {
    await cleanupUser(coach.id);
    await cleanupUser(client.id);
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  });

  it("really is running in that timezone", () => {
    const offset = new Date("2026-09-15T12:00:00Z").getTimezoneOffset();
    const expected = { "Pacific/Kiritimati": -840, "Pacific/Pago_Pago": 660, "Asia/Kolkata": -330, UTC: 0 }[timezone];
    expect(offset).toBe(expected);
  });

  it.each(DATES)("weight logged for %s keeps that date on write, on the client's read and on the coach's", async (date) => {
    const saved = await api
      .post("/v1/tracking/weight")
      .set("Authorization", `Bearer ${client.token}`)
      .send({ date, weightKg: 70 });
    expect(saved.status).toBe(200);
    expect(saved.body.weightEntry.date).toBe(date);

    // A single-day range must find it, dated the same.
    const mine = await api
      .get("/v1/tracking/weight")
      .query({ from: date, to: date })
      .set("Authorization", `Bearer ${client.token}`);
    expect(mine.body.weightEntries.map((entry: { date: string }) => entry.date)).toEqual([date]);

    const coachView = await api
      .get(`/v1/coach/clients/${client.id}/weight`)
      .query({ from: date, to: date })
      .set("Authorization", `Bearer ${coach.token}`);
    expect(coachView.body.weightEntries.map((entry: { date: string }) => entry.date)).toEqual([date]);
  });

  it.each(DATES)("check-in logged for %s keeps that date on write and on both reads", async (date) => {
    const saved = await api
      .post("/v1/tracking/checkin")
      .set("Authorization", `Bearer ${client.token}`)
      .send({ assignmentId, date, completedItemIds: [] });
    expect(saved.status).toBe(200);
    expect(saved.body.checkIn.date).toBe(date);

    const mine = await api
      .get("/v1/tracking/checkin")
      .query({ assignmentId, from: date, to: date })
      .set("Authorization", `Bearer ${client.token}`);
    expect(mine.body.checkIns.map((row: { date: string }) => row.date)).toEqual([date]);

    const coachView = await api
      .get(`/v1/coach/clients/${client.id}/checkins`)
      .query({ from: date, to: date })
      .set("Authorization", `Bearer ${coach.token}`);
    expect(coachView.body.checkIns.map((row: { date: string }) => row.date)).toEqual([date]);
  });

  it("a two-day range finds exactly the entries dated inside it", async () => {
    const res = await api
      .get("/v1/tracking/weight")
      .query({ from: "2026-09-14", to: "2026-09-15" })
      .set("Authorization", `Bearer ${client.token}`);
    expect(res.body.weightEntries.map((entry: { date: string }) => entry.date)).toEqual(["2026-09-15"]);
  });
});
