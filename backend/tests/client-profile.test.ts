import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { api, cleanupUser, registerUser, type TestUser } from "./helpers.js";

describe("client profile endpoints", () => {
  let client: TestUser;
  let coach: TestUser;

  beforeAll(async () => {
    client = await registerUser("CLIENT", "profileclient");
    coach = await registerUser("COACH", "profilecoach");
  });

  afterAll(async () => {
    await cleanupUser(client.id);
    await cleanupUser(coach.id);
  });

  it("returns null-safe defaults before the client has filled anything in", async () => {
    const res = await api.get("/v1/client/profile").set("Authorization", `Bearer ${client.token}`);

    expect(res.status).toBe(200);
    expect(res.body.profile.email).toBe(client.email);
    expect(res.body.profile.role).toBe("CLIENT");
    expect(res.body.profile.heightCm).toBeNull();
    expect(res.body.profile.weightKg).toBeNull();
    expect(res.body.profile.goals).toBeNull();
  });

  it("creates the profile row on first update and persists the values", async () => {
    const res = await api
      .patch("/v1/client/profile")
      .set("Authorization", `Bearer ${client.token}`)
      .send({ name: "Updated Name", heightCm: 181, weightKg: 79.5, goals: "Deadlift 200kg" });

    expect(res.status).toBe(200);
    expect(res.body.profile.name).toBe("Updated Name");
    expect(res.body.profile.heightCm).toBe(181);
    expect(res.body.profile.weightKg).toBe(79.5);

    const readBack = await api.get("/v1/client/profile").set("Authorization", `Bearer ${client.token}`);
    expect(readBack.body.profile.goals).toBe("Deadlift 200kg");
  });

  it("leaves untouched fields alone on a partial update", async () => {
    await api
      .patch("/v1/client/profile")
      .set("Authorization", `Bearer ${client.token}`)
      .send({ goals: "Just the goals this time" });

    const res = await api.get("/v1/client/profile").set("Authorization", `Bearer ${client.token}`);
    expect(res.body.profile.goals).toBe("Just the goals this time");
    expect(res.body.profile.heightCm).toBe(181);
    expect(res.body.profile.name).toBe("Updated Name");
  });

  it("rejects an empty update body", async () => {
    const res = await api
      .patch("/v1/client/profile")
      .set("Authorization", `Bearer ${client.token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 403 to a coach on GET", async () => {
    const res = await api.get("/v1/client/profile").set("Authorization", `Bearer ${coach.token}`);
    expect(res.status).toBe(403);
  });

  it("returns 403 to a coach on PATCH", async () => {
    const res = await api
      .patch("/v1/client/profile")
      .set("Authorization", `Bearer ${coach.token}`)
      .send({ goals: "coach should not be able to write this" });

    expect(res.status).toBe(403);
  });

  it("returns 401 without a token", async () => {
    const res = await api.get("/v1/client/profile");
    expect(res.status).toBe(401);
  });
});
