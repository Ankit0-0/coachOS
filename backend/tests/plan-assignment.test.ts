import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  api,
  cleanupUser,
  createAcceptedInvite,
  registerUser,
  VALID_WORKOUT_CONTENT,
  type TestUser,
} from "./helpers.js";

describe("plan assignment: one ACTIVE assignment per type", () => {
  let coach: TestUser;
  let client: TestUser;

  beforeAll(async () => {
    coach = await registerUser("COACH", "asgcoach");
    client = await registerUser("CLIENT", "asgclient");
    await createAcceptedInvite(coach, client);
  });

  afterAll(async () => {
    await cleanupUser(coach.id);
    await cleanupUser(client.id);
  });

  it("completes the prior ACTIVE assignment when a second plan of the same type is assigned", async () => {
    const planOne = await api
      .post("/v1/coach/plans")
      .set("Authorization", `Bearer ${coach.token}`)
      .send({ type: "WORKOUT", title: "Plan One", content: VALID_WORKOUT_CONTENT });
    const planTwo = await api
      .post("/v1/coach/plans")
      .set("Authorization", `Bearer ${coach.token}`)
      .send({ type: "WORKOUT", title: "Plan Two", content: VALID_WORKOUT_CONTENT });

    const planOneId = planOne.body.plan.id as string;
    const planTwoId = planTwo.body.plan.id as string;

    const firstAssign = await api
      .post("/v1/coach/assignments")
      .set("Authorization", `Bearer ${coach.token}`)
      .send({ clientId: client.id, planId: planOneId });
    expect(firstAssign.status).toBe(201);
    expect(firstAssign.body.assignment.status).toBe("ACTIVE");

    const secondAssign = await api
      .post("/v1/coach/assignments")
      .set("Authorization", `Bearer ${coach.token}`)
      .send({ clientId: client.id, planId: planTwoId });
    expect(secondAssign.status).toBe(201);
    expect(secondAssign.body.assignment.status).toBe("ACTIVE");

    const listRes = await api
      .get("/v1/coach/assignments")
      .query({ clientId: client.id })
      .set("Authorization", `Bearer ${coach.token}`);
    expect(listRes.status).toBe(200);

    const assignments = listRes.body.assignments as { planId: string; status: string }[];
    const active = assignments.filter((a) => a.status === "ACTIVE");
    const completed = assignments.filter((a) => a.status === "COMPLETED");

    expect(active).toHaveLength(1);
    expect(active[0]?.planId).toBe(planTwoId);
    expect(completed).toHaveLength(1);
    expect(completed[0]?.planId).toBe(planOneId);
  });
});
