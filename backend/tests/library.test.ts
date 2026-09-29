import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The presigner is mocked so image keys come back as recognisable "signed" URLs
 * without reaching S3, and deleteObject records what would have been removed.
 */
const { getSignedUrlMock, deleted } = vi.hoisted(() => ({
  getSignedUrlMock: vi.fn(),
  deleted: [] as string[],
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: getSignedUrlMock }));

vi.mock("../src/features/upload/service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/features/upload/service.js")>();
  return {
    ...actual,
    deleteObject: vi.fn(async (key: string) => {
      deleted.push(key);
    }),
  };
});

const { env } = await import("../src/config/env.js");
const { prisma } = await import("../src/config/prisma.config.js");
const { api, cleanupUser, createAdmin, registerPendingCoach, registerUser, VALID_WORKOUT_CONTENT } = await import(
  "./helpers.js"
);
type TestUser = Awaited<ReturnType<typeof registerUser>>;

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

/** Unique to this run, so searches only ever match rows these tests made. */
const TAG = `zqlib${Date.now()}`;

const originalAws = {
  awsRegion: env.awsRegion,
  awsAccessKeyId: env.awsAccessKeyId,
  awsSecretAccessKey: env.awsSecretAccessKey,
  s3Bucket: env.s3Bucket,
};

describe("exercise and diet-item library", () => {
  let admin: TestUser;
  let coach: TestUser;
  let otherCoach: TestUser;
  let pendingCoach: TestUser;
  let client: TestUser;
  const globalExerciseIds: string[] = [];
  const globalDietItemIds: string[] = [];

  beforeAll(async () => {
    Object.assign(env, {
      awsRegion: "eu-test-1",
      awsAccessKeyId: "AKIATESTTESTTESTTEST",
      awsSecretAccessKey: "test-secret-not-a-real-key",
      s3Bucket: "coachos-test-bucket",
    });
    admin = await createAdmin("libadmin");
    coach = await registerUser("COACH", "libcoach");
    otherCoach = await registerUser("COACH", "libother");
    pendingCoach = await registerPendingCoach("libpending");
    client = await registerUser("CLIENT", "libclient");
  });

  afterAll(async () => {
    Object.assign(env, originalAws);
    // Global rows have no owner, so cleanupUser can't reach them.
    await prisma.exercise.deleteMany({ where: { id: { in: globalExerciseIds } } });
    await prisma.dietItem.deleteMany({ where: { id: { in: globalDietItemIds } } });
    for (const user of [admin, coach, otherCoach, pendingCoach, client]) await cleanupUser(user.id);
  });

  beforeEach(() => {
    deleted.length = 0;
    getSignedUrlMock.mockReset();
    getSignedUrlMock.mockImplementation(async (_client: unknown, command: { input: { Key: string } }) => {
      return `https://signed.test/${command.input.Key}`;
    });
  });

  async function createGlobalExercise(body: Record<string, unknown>) {
    const res = await api.post("/v1/admin/exercises").set(auth(admin)).send(body);
    if (res.status === 201) globalExerciseIds.push(res.body.exercise.id as string);
    return res;
  }

  async function createGlobalDietItem(body: Record<string, unknown>) {
    const res = await api.post("/v1/admin/diet-items").set(auth(admin)).send(body);
    if (res.status === 201) globalDietItemIds.push(res.body.dietItem.id as string);
    return res;
  }

  const exerciseKey = (name: string) => `users/${admin.id}/exercise/${name}.jpg`;

  describe("authorisation", () => {
    const routes: [method: "get" | "post" | "patch" | "delete", path: string][] = [
      ["get", "/v1/coach/exercises"],
      ["post", "/v1/coach/exercises"],
      ["get", "/v1/coach/diet-items"],
      ["post", "/v1/coach/diet-items"],
      ["get", "/v1/admin/exercises"],
      ["post", "/v1/admin/exercises"],
      ["get", "/v1/admin/exercises/some-id"],
      ["patch", "/v1/admin/exercises/some-id"],
      ["delete", "/v1/admin/exercises/some-id"],
      ["get", "/v1/admin/diet-items"],
      ["post", "/v1/admin/diet-items"],
      ["get", "/v1/admin/diet-items/some-id"],
      ["patch", "/v1/admin/diet-items/some-id"],
      ["delete", "/v1/admin/diet-items/some-id"],
    ];

    it.each(routes)("answers 403 to a client on %s %s", async (method, path) => {
      const res = await api[method](path).set(auth(client)).send({ name: `${TAG} client attempt` });
      expect(res.status).toBe(403);
    });

    it.each(routes.filter(([, path]) => path.startsWith("/v1/admin")))(
      "answers 403 to a coach on %s %s",
      async (method, path) => {
        const res = await api[method](path).set(auth(coach)).send({ name: `${TAG} coach attempt` });
        expect(res.status).toBe(403);
      },
    );

    it("answers 401 without a token", async () => {
      expect((await api.get("/v1/coach/exercises")).status).toBe(401);
      expect((await api.get("/v1/admin/diet-items")).status).toBe(401);
    });

    it("answers 423 when a coach awaiting approval tries to save an entry", async () => {
      const res = await api.post("/v1/coach/exercises").set(auth(pendingCoach)).send({ name: `${TAG} pending` });
      expect(res.status).toBe(423);
    });
  });

  describe("admin: global exercises", () => {
    it("creates Barbell row with its muscles, training day, equipment, image and video", async () => {
      const res = await createGlobalExercise({
        name: `${TAG} Barbell row`,
        primaryMuscles: ["UPPER_BACK", "LATS"],
        secondaryMuscles: ["TRAPS", "BICEPS"],
        trainingDay: "BACK",
        equipment: "BARBELL",
        instructions: "Hinge to about 45 degrees and pull to the lower ribs.",
        imageKey: exerciseKey("barbell-row"),
        videoUrl: "https://www.youtube.com/watch?v=example",
      });

      expect(res.status).toBe(201);
      expect(res.body.exercise).toMatchObject({
        name: `${TAG} Barbell row`,
        primaryMuscles: ["UPPER_BACK", "LATS"],
        secondaryMuscles: ["TRAPS", "BICEPS"],
        trainingDay: "BACK",
        equipment: "BARBELL",
        videoUrl: "https://www.youtube.com/watch?v=example",
        imageUrl: `https://signed.test/${exerciseKey("barbell-row")}`,
        hasImage: true,
        isGlobal: true,
      });
      // The key itself never goes back out.
      expect(res.body.exercise.imageKey).toBeUndefined();

      const stored = await prisma.exercise.findUniqueOrThrow({ where: { id: res.body.exercise.id } });
      expect(stored.createdById).toBeNull();
    });

    it.each(["not a url", "www.example.com/video", "ftp://example.com/video.mp4", "javascript:alert(1)"])(
      "rejects the videoUrl %j",
      async (videoUrl) => {
        const res = await createGlobalExercise({ name: `${TAG} Bad video ${videoUrl}`, videoUrl });
        expect(res.status).toBe(400);
      },
    );

    it("accepts a plain http(s) link without caring about the provider", async () => {
      const res = await createGlobalExercise({ name: `${TAG} Any link`, videoUrl: "http://example.com/any/path?x=1" });
      expect(res.status).toBe(201);
    });

    it("rejects a second global entry with the same name in a different case", async () => {
      await createGlobalExercise({ name: `${TAG} Duplicate lift` });
      const res = await createGlobalExercise({ name: `${TAG} DUPLICATE LIFT` });
      expect(res.status).toBe(409);
    });

    it("rejects an image key that is not the admin's own upload", async () => {
      const res = await createGlobalExercise({
        name: `${TAG} Stolen image`,
        imageKey: `users/${coach.id}/exercise/theirs.jpg`,
      });
      expect(res.status).toBe(403);
    });

    it("rejects an image key uploaded for a different purpose", async () => {
      const res = await createGlobalExercise({
        name: `${TAG} Avatar as image`,
        imageKey: `users/${admin.id}/avatar/me.jpg`,
      });
      expect(res.status).toBe(403);
    });

    it("lists global entries with search, filters and pages", async () => {
      await createGlobalExercise({ name: `${TAG} Listed curl`, primaryMuscles: ["BICEPS"], trainingDay: "ARMS" });
      await createGlobalExercise({ name: `${TAG} Listed squat`, primaryMuscles: ["QUADS"], trainingDay: "LEGS" });

      const bySearch = await api.get(`/v1/admin/exercises?q=${TAG} listed`).set(auth(admin));
      expect(bySearch.status).toBe(200);
      expect(bySearch.body.exercises.map((row: { name: string }) => row.name)).toEqual([
        `${TAG} Listed curl`,
        `${TAG} Listed squat`,
      ]);
      expect(bySearch.body).toMatchObject({ total: 2, page: 1, pageSize: 25 });

      const byMuscle = await api.get(`/v1/admin/exercises?q=${TAG}&muscleGroup=QUADS`).set(auth(admin));
      expect(byMuscle.body.exercises.map((row: { name: string }) => row.name)).toEqual([`${TAG} Listed squat`]);

      const byDay = await api.get(`/v1/admin/exercises?q=${TAG}&trainingDay=ARMS&muscleGroup=`).set(auth(admin));
      expect(byDay.body.exercises.map((row: { name: string }) => row.name)).toEqual([`${TAG} Listed curl`]);

      const pageTwo = await api.get(`/v1/admin/exercises?q=${TAG} listed&page=2`).set(auth(admin));
      expect(pageTwo.body.exercises).toEqual([]);
      expect(pageTwo.body.total).toBe(2);
    });

    it("rejects an unknown filter value", async () => {
      const res = await api.get("/v1/admin/exercises?muscleGroup=NECK").set(auth(admin));
      expect(res.status).toBe(400);
    });

    it("updates only the fields sent, and replacing the image deletes the old object", async () => {
      const created = await createGlobalExercise({
        name: `${TAG} Patchable`,
        primaryMuscles: ["CHEST"],
        equipment: "DUMBBELL",
        imageKey: exerciseKey("first"),
      });
      const id = created.body.exercise.id as string;

      const renamed = await api.patch(`/v1/admin/exercises/${id}`).set(auth(admin)).send({ name: `${TAG} Patched` });
      expect(renamed.status).toBe(200);
      expect(renamed.body.exercise).toMatchObject({ name: `${TAG} Patched`, primaryMuscles: ["CHEST"], equipment: "DUMBBELL" });
      expect(deleted).toEqual([]);

      const replaced = await api
        .patch(`/v1/admin/exercises/${id}`)
        .set(auth(admin))
        .send({ imageKey: exerciseKey("second") });
      expect(replaced.status).toBe(200);
      expect(replaced.body.exercise.imageUrl).toBe(`https://signed.test/${exerciseKey("second")}`);
      expect(deleted).toEqual([exerciseKey("first")]);

      const removed = await api.patch(`/v1/admin/exercises/${id}`).set(auth(admin)).send({ imageKey: null });
      expect(removed.status).toBe(200);
      expect(removed.body.exercise).toMatchObject({ imageUrl: null, hasImage: false });
      expect(deleted).toEqual([exerciseKey("first"), exerciseKey("second")]);
    });

    it("deletes an entry and the image behind it", async () => {
      const created = await createGlobalExercise({ name: `${TAG} Deletable`, imageKey: exerciseKey("doomed") });
      const id = created.body.exercise.id as string;

      const res = await api.delete(`/v1/admin/exercises/${id}`).set(auth(admin));
      expect(res.status).toBe(204);
      expect(deleted).toEqual([exerciseKey("doomed")]);
      expect(await prisma.exercise.findUnique({ where: { id } })).toBeNull();
    });

    it("answers 404 for an id that does not exist", async () => {
      const res = await api.patch("/v1/admin/exercises/does-not-exist").set(auth(admin)).send({ name: "x" });
      expect(res.status).toBe(404);
    });
  });

  describe("coach: exercises", () => {
    let ownId: string;

    beforeAll(async () => {
      await createGlobalExercise({ name: `${TAG} Bench press`, primaryMuscles: ["CHEST"], trainingDay: "CHEST" });
      await createGlobalExercise({ name: `${TAG} Incline bench press`, primaryMuscles: ["CHEST"], trainingDay: "CHEST" });
      await createGlobalExercise({
        name: `${TAG} Dumbbell bench press`,
        primaryMuscles: ["CHEST"],
        trainingDay: "CHEST",
        imageKey: exerciseKey("db-bench"),
      });
      await createGlobalExercise({ name: `${TAG} Goblet squat`, primaryMuscles: ["QUADS"], trainingDay: "LEGS" });

      const own = await api.post("/v1/coach/exercises").set(auth(coach)).send({ name: `${TAG} Smith machine JM press` });
      ownId = own.body.exercise.id as string;
      await api.post("/v1/coach/exercises").set(auth(otherCoach)).send({ name: `${TAG} Secret bench variation` });
    });

    it("creates an entry scoped to the caller", async () => {
      const stored = await prisma.exercise.findUniqueOrThrow({ where: { id: ownId } });
      expect(stored.createdById).toBe(coach.id);
      expect(stored.name).toBe(`${TAG} Smith machine JM press`);
    });

    it("matches case-insensitively and on partial words", async () => {
      const res = await api.get(`/v1/coach/exercises?q=${TAG.toUpperCase()} BENC`).set(auth(coach));
      expect(res.status).toBe(200);
      const names = res.body.exercises.map((row: { name: string }) => row.name);
      expect(names).toEqual(
        expect.arrayContaining([`${TAG} Bench press`, `${TAG} Incline bench press`, `${TAG} Dumbbell bench press`]),
      );
      expect(names).not.toContain(`${TAG} Goblet squat`);

      // Words in any order: "press incl" still finds "Incline bench press".
      const reordered = await api.get(`/v1/coach/exercises?q=${TAG} press incl`).set(auth(coach));
      expect(reordered.body.exercises.map((row: { name: string }) => row.name)).toEqual([`${TAG} Incline bench press`]);
    });

    it("puts the closest match first", async () => {
      const res = await api.get(`/v1/coach/exercises?q=${TAG} bench`).set(auth(coach));
      expect(res.body.exercises[0].name).toBe(`${TAG} Bench press`);
    });

    it("shows global entries and the coach's own, never another coach's", async () => {
      const res = await api.get(`/v1/coach/exercises?q=${TAG}`).set(auth(coach));
      const names = res.body.exercises.map((row: { name: string }) => row.name);
      expect(names).toContain(`${TAG} Bench press`);
      expect(names).toContain(`${TAG} Smith machine JM press`);
      expect(names).not.toContain(`${TAG} Secret bench variation`);
      // Own entries come first.
      expect(res.body.exercises[0]).toMatchObject({ name: `${TAG} Smith machine JM press`, isGlobal: false });

      const other = await api.get(`/v1/coach/exercises?q=${TAG}`).set(auth(otherCoach));
      const otherNames = other.body.exercises.map((row: { name: string }) => row.name);
      expect(otherNames).toContain(`${TAG} Secret bench variation`);
      expect(otherNames).not.toContain(`${TAG} Smith machine JM press`);
    });

    it("includes a signed image URL where the entry has an image", async () => {
      const res = await api.get(`/v1/coach/exercises?q=${TAG} dumbbell bench`).set(auth(coach));
      expect(res.body.exercises[0]).toMatchObject({
        name: `${TAG} Dumbbell bench press`,
        imageUrl: `https://signed.test/${exerciseKey("db-bench")}`,
      });
    });

    it("filters by training day and primary muscle", async () => {
      type Row = { name: string; trainingDay: string; primaryMuscles: string[] };

      const byDay = await api.get(`/v1/coach/exercises?q=${TAG}&trainingDay=LEGS`).set(auth(coach));
      const legRows: Row[] = byDay.body.exercises;
      expect(legRows.map((row) => row.name)).toContain(`${TAG} Goblet squat`);
      expect(legRows.every((row) => row.trainingDay === "LEGS")).toBe(true);

      const byMuscle = await api.get(`/v1/coach/exercises?q=${TAG}&muscleGroup=QUADS`).set(auth(coach));
      const quadRows: Row[] = byMuscle.body.exercises;
      expect(quadRows.map((row) => row.name)).toContain(`${TAG} Goblet squat`);
      expect(quadRows.every((row) => row.primaryMuscles.includes("QUADS"))).toBe(true);
    });

    it("rejects a name the coach can already see, in any case", async () => {
      const ownClash = await api.post("/v1/coach/exercises").set(auth(coach)).send({ name: `${TAG} SMITH MACHINE JM PRESS` });
      expect(ownClash.status).toBe(409);
      const globalClash = await api.post("/v1/coach/exercises").set(auth(coach)).send({ name: `${TAG} bench press` });
      expect(globalClash.status).toBe(409);
    });

    it("rejects a non-URL videoUrl from a coach too", async () => {
      const res = await api
        .post("/v1/coach/exercises")
        .set(auth(coach))
        .send({ name: `${TAG} Coach video`, videoUrl: "just some text" });
      expect(res.status).toBe(400);
    });

    it("offers the coach's recently used exercise names when nothing is typed", async () => {
      const plan = await api
        .post("/v1/coach/plans")
        .set(auth(coach))
        .send({
          type: "WORKOUT",
          title: `${TAG} Recent plan`,
          cycleLengthDays: 1,
          content: {
            ...VALID_WORKOUT_CONTENT,
            days: [
              {
                ...VALID_WORKOUT_CONTENT.days[0],
                exercises: [
                  { id: "d0-a", name: `${TAG} Bench press`, note: "", sets: 3 },
                  { id: "d0-b", name: `${TAG} Not in the library`, note: "", sets: 3 },
                ],
              },
            ],
          },
        });
      expect(plan.status).toBe(201);

      const res = await api.get("/v1/coach/exercises").set(auth(coach));
      expect(res.status).toBe(200);
      expect(res.body.recent.slice(0, 2)).toMatchObject([
        { name: `${TAG} Bench press`, exercise: { name: `${TAG} Bench press`, isGlobal: true } },
        { name: `${TAG} Not in the library`, exercise: null },
      ]);

      // Only on an untouched picker.
      const searched = await api.get(`/v1/coach/exercises?q=${TAG}`).set(auth(coach));
      expect(searched.body.recent).toEqual([]);
      // And never from another coach's plans.
      const other = await api.get("/v1/coach/exercises").set(auth(otherCoach));
      expect(other.body.recent.map((row: { name: string }) => row.name)).not.toContain(`${TAG} Not in the library`);
    });

    it("never lets an admin see, edit or delete a coach's own entry", async () => {
      const get = await api.get(`/v1/admin/exercises/${ownId}`).set(auth(admin));
      expect(get.status).toBe(404);

      const patch = await api.patch(`/v1/admin/exercises/${ownId}`).set(auth(admin)).send({ name: `${TAG} Hijacked` });
      expect(patch.status).toBe(404);

      const remove = await api.delete(`/v1/admin/exercises/${ownId}`).set(auth(admin));
      expect(remove.status).toBe(404);

      const stored = await prisma.exercise.findUniqueOrThrow({ where: { id: ownId } });
      expect(stored).toMatchObject({ name: `${TAG} Smith machine JM press`, createdById: coach.id });

      const list = await api.get(`/v1/admin/exercises?q=${TAG} smith`).set(auth(admin));
      expect(list.body.exercises).toEqual([]);
    });

    it("leaves a saved plan alone when the library entry it was picked from is deleted", async () => {
      const created = await createGlobalExercise({ name: `${TAG} Picked then deleted` });
      const plan = await api
        .post("/v1/coach/plans")
        .set(auth(coach))
        .send({
          type: "WORKOUT",
          title: `${TAG} Survives deletion`,
          cycleLengthDays: 1,
          content: {
            ...VALID_WORKOUT_CONTENT,
            days: [
              {
                ...VALID_WORKOUT_CONTENT.days[0],
                exercises: [{ id: "d0-picked", name: `${TAG} Picked then deleted`, note: "", sets: 4 }],
              },
            ],
          },
        });
      const planId = plan.body.plan.id as string;

      expect((await api.delete(`/v1/admin/exercises/${created.body.exercise.id}`).set(auth(admin))).status).toBe(204);

      const after = await api.get(`/v1/coach/plans/${planId}`).set(auth(coach));
      expect(after.status).toBe(200);
      expect(after.body.plan.content.days[0].exercises).toEqual([
        { id: "d0-picked", name: `${TAG} Picked then deleted`, note: "", sets: 4 },
      ]);
    });

    it("removes a coach's own entries when their account is deleted, rather than making them global", async () => {
      const leaver = await registerUser("COACH", "libleaver");
      const saved = await api.post("/v1/coach/exercises").set(auth(leaver)).send({ name: `${TAG} Leaver lift` });
      await cleanupUser(leaver.id);
      expect(await prisma.exercise.findUnique({ where: { id: saved.body.exercise.id } })).toBeNull();
    });
  });

  describe("diet items", () => {
    let ownId: string;

    beforeAll(async () => {
      await createGlobalDietItem({ name: `${TAG} Poha`, mealType: "BREAKFAST", calories: 250, proteinG: 5 });
      await createGlobalDietItem({ name: `${TAG} Paneer bhurji`, mealType: "DINNER", calories: 300, proteinG: 18 });
      await createGlobalDietItem({ name: `${TAG} Paneer tikka`, mealType: "DINNER", calories: 280, proteinG: 18 });
      const own = await api.post("/v1/coach/diet-items").set(auth(coach)).send({ name: `${TAG} Ghar ka paneer wrap` });
      ownId = own.body.dietItem.id as string;
      await api.post("/v1/coach/diet-items").set(auth(otherCoach)).send({ name: `${TAG} Other paneer bowl` });
    });

    it("searches case-insensitively on partial words and scopes to the caller", async () => {
      const res = await api.get(`/v1/coach/diet-items?q=${TAG} PANE`).set(auth(coach));
      expect(res.status).toBe(200);
      const names = res.body.dietItems.map((row: { name: string }) => row.name);
      expect(names[0]).toBe(`${TAG} Ghar ka paneer wrap`);
      expect(names).toEqual(expect.arrayContaining([`${TAG} Paneer bhurji`, `${TAG} Paneer tikka`]));
      expect(names).not.toContain(`${TAG} Other paneer bowl`);
      expect(names).not.toContain(`${TAG} Poha`);
    });

    it("filters by meal type", async () => {
      const res = await api.get(`/v1/coach/diet-items?q=${TAG}&mealType=BREAKFAST`).set(auth(coach));
      expect(res.body.dietItems.map((row: { name: string }) => row.name)).toEqual([`${TAG} Poha`]);
    });

    it("creates a coach entry scoped to the caller", async () => {
      const stored = await prisma.dietItem.findUniqueOrThrow({ where: { id: ownId } });
      expect(stored.createdById).toBe(coach.id);
    });

    it("never lets an admin edit or delete a coach's own diet item", async () => {
      const patch = await api.patch(`/v1/admin/diet-items/${ownId}`).set(auth(admin)).send({ calories: 1 });
      expect(patch.status).toBe(404);
      const remove = await api.delete(`/v1/admin/diet-items/${ownId}`).set(auth(admin));
      expect(remove.status).toBe(404);
      expect(await prisma.dietItem.findUnique({ where: { id: ownId } })).not.toBeNull();
    });

    it("manages global items with an image, deleting the object on delete", async () => {
      const key = `users/${admin.id}/diet-item/dal.jpg`;
      const created = await createGlobalDietItem({
        name: `${TAG} Dal tadka`,
        mealType: "LUNCH",
        calories: 180,
        proteinG: 9,
        notes: "1 katori",
        imageKey: key,
      });
      expect(created.status).toBe(201);
      expect(created.body.dietItem).toMatchObject({ imageUrl: `https://signed.test/${key}`, calories: 180 });

      const patched = await api
        .patch(`/v1/admin/diet-items/${created.body.dietItem.id}`)
        .set(auth(admin))
        .send({ proteinG: 10, notes: null });
      expect(patched.body.dietItem).toMatchObject({ proteinG: 10, notes: null, calories: 180 });

      const removed = await api.delete(`/v1/admin/diet-items/${created.body.dietItem.id}`).set(auth(admin));
      expect(removed.status).toBe(204);
      expect(deleted).toEqual([key]);
    });

    it("rejects an exercise image used for a diet item", async () => {
      const res = await createGlobalDietItem({ name: `${TAG} Wrong folder`, imageKey: exerciseKey("x") });
      expect(res.status).toBe(403);
    });

    it("rejects calories that are not a whole number", async () => {
      const res = await createGlobalDietItem({ name: `${TAG} Fractional`, calories: 12.5 });
      expect(res.status).toBe(400);
    });
  });

  describe("uploads", () => {
    it.each(["exercise", "diet-item"])("presigns an admin upload for %s images", async (purpose) => {
      const res = await api
        .post("/v1/uploads/presign")
        .set(auth(admin))
        .send({ contentType: "image/jpeg", purpose });
      expect(res.status).toBe(201);
      expect(res.body.key).toMatch(new RegExp(`^users/${admin.id}/${purpose}/[a-z0-9]+\\.jpg$`));
    });
  });
});
