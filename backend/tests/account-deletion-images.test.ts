import { afterAll, describe, expect, it, vi } from "vitest";

const calls: { userId: string; knownKeys: readonly string[] }[] = [];

vi.mock("../src/features/upload/service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/features/upload/service.js")>();
  return {
    ...actual,
    deleteUserObjects: vi.fn(async (userId: string, knownKeys: readonly string[] = []) => {
      calls.push({ userId, knownKeys });
      return knownKeys.length;
    }),
  };
});

const { api, cleanupUser, createAcceptedInvite, registerUser, VALID_DIET_CONTENT } = await import("./helpers.js");
type TestUser = Awaited<ReturnType<typeof registerUser>>;

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

describe("deleting an account deletes its images by their known keys", () => {
  const leftovers: string[] = [];

  afterAll(async () => {
    for (const id of leftovers) await cleanupUser(id);
  });

  it("hands the avatar, progress photos and meal photos to S3 deletion", async () => {
    const coach = await registerUser("COACH", "delimg-coach");
    const client = await registerUser("CLIENT", "delimg-client");
    leftovers.push(coach.id, client.id);
    await createAcceptedInvite(coach, client);
    const key = (name: string) => `users/${client.id}/weight/${name}.jpg`;

    const plan = await api
      .post("/v1/coach/plans")
      .set(auth(coach))
      .send({ type: "DIET", title: "Image diet", cycleLengthDays: 1, content: VALID_DIET_CONTENT });
    const assigned = await api.post("/v1/coach/assignments").set(auth(coach)).send({ clientId: client.id, planId: plan.body.plan.id });

    await api.patch("/v1/client/profile").set(auth(client)).send({ avatarKey: `users/${client.id}/avatar/me.jpg` });
    await api.post("/v1/tracking/weight").set(auth(client)).send({ date: "2026-09-01", weightKg: 80, photoKey: key("front") });
    await api
      .post("/v1/tracking/checkin")
      .set(auth(client))
      .send({
        assignmentId: assigned.body.assignment.id,
        date: "2026-09-01",
        completedItemIds: [],
        photoKeys: { breakfast: `users/${client.id}/diet/eggs.jpg` },
      });

    expect((await api.delete("/v1/account").set(auth(client))).status).toBe(200);

    const call = calls.find((entry) => entry.userId === client.id);
    expect([...(call?.knownKeys ?? [])].sort()).toEqual(
      [`users/${client.id}/avatar/me.jpg`, `users/${client.id}/diet/eggs.jpg`, key("front")].sort(),
    );
  });
});
