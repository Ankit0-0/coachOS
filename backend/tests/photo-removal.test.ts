import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const deleted: string[] = [];

vi.mock("../src/features/upload/service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/features/upload/service.js")>();
  return {
    ...actual,
    deleteObject: vi.fn(async (key: string) => {
      deleted.push(key);
    }),
  };
});

const { api, cleanupUser, createAcceptedInvite, registerUser, VALID_DIET_CONTENT } = await import("./helpers.js");
type TestUser = Awaited<ReturnType<typeof registerUser>>;

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

describe("removing a photo deletes its S3 object", () => {
  let coach: TestUser;
  let client: TestUser;
  let assignmentId: string;
  const key = (name: string) => `users/${client.id}/weight/${name}.jpg`;
  const mealKey = (name: string) => `users/${client.id}/diet/${name}.jpg`;

  beforeAll(async () => {
    coach = await registerUser("COACH", "photocoach");
    client = await registerUser("CLIENT", "photoclient");
    await createAcceptedInvite(coach, client);
    const plan = await api
      .post("/v1/coach/plans")
      .set(auth(coach))
      .send({ type: "DIET", title: "Photo diet", cycleLengthDays: 1, content: VALID_DIET_CONTENT });
    const assigned = await api
      .post("/v1/coach/assignments")
      .set(auth(coach))
      .send({ clientId: client.id, planId: plan.body.plan.id });
    assignmentId = assigned.body.assignment.id;
  });

  beforeEach(() => {
    deleted.length = 0;
  });

  afterAll(async () => {
    await cleanupUser(coach.id);
    await cleanupUser(client.id);
  });

  it("deletes the progress photo when it is cleared or replaced, and keeps it otherwise", async () => {
    await api.post("/v1/tracking/weight").set(auth(client)).send({ date: "2026-09-01", weightKg: 80, photoKey: key("a") });
    // Logging the weight again without a photoKey leaves the photo alone.
    await api.post("/v1/tracking/weight").set(auth(client)).send({ date: "2026-09-01", weightKg: 80.2 });
    expect(deleted).toEqual([]);

    await api.post("/v1/tracking/weight").set(auth(client)).send({ date: "2026-09-01", weightKg: 80.2, photoKey: key("b") });
    expect(deleted).toEqual([key("a")]);

    const cleared = await api.post("/v1/tracking/weight").set(auth(client)).send({ date: "2026-09-01", weightKg: 80.2, photoKey: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.weightEntry.photoUrl).toBeNull();
    expect(deleted).toEqual([key("a"), key("b")]);
  });

  it("deletes one meal's photo when its key is set to null, and all of them when the map is null", async () => {
    const save = (photoKeys: Record<string, string | null> | null) =>
      api.post("/v1/tracking/checkin").set(auth(client)).send({ assignmentId, date: "2026-09-02", completedItemIds: [], photoKeys });

    await save({ breakfast: mealKey("b1"), lunch: mealKey("l1") });
    expect(deleted).toEqual([]);

    await save({ breakfast: null });
    expect(deleted).toEqual([mealKey("b1")]);

    await save(null);
    expect(deleted).toEqual([mealKey("b1"), mealKey("l1")]);
  });
});
