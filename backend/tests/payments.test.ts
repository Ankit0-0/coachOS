import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../src/config/prisma.config.js";
import { runPaymentReminders } from "../src/jobs/subscription-reminders.js";
import { sendPushMessages, type PushMessage } from "../src/utils/push.js";
import { api, cleanupUser, createAcceptedInvite, registerUser, type TestUser } from "./helpers.js";

// Expo is stood in for; every message the backend would send lands here.
vi.mock("../src/utils/push.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/utils/push.js")>();
  return { ...original, sendPushMessages: vi.fn(async () => [] as string[]) };
});
const sent = vi.mocked(sendPushMessages);

function auth(user: TestUser) {
  return { Authorization: `Bearer ${user.token}` };
}

function dateKey(daysFromToday: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

const users: string[] = [];

async function pair(prefix: string) {
  const coach = await registerUser("COACH", `${prefix}-coach`);
  const client = await registerUser("CLIENT", `${prefix}-client`);
  users.push(coach.id, client.id);
  await createAcceptedInvite(coach, client);
  return { coach, client };
}

async function period(coach: TestUser, client: TestUser, body: Record<string, unknown>) {
  const res = await api.post(`/v1/coach/clients/${client.id}/subscriptions`).set(auth(coach)).send(body);
  expect(res.status).toBe(201);
  return res.body.subscription as { id: string; paymentStatus: string; receiptNumber: string | null };
}

async function withToken(member: TestUser): Promise<string> {
  const token = `ExponentPushToken[pay-${member.id}]`;
  expect((await api.post("/v1/push-tokens").set(auth(member)).send({ token, platform: "ANDROID" })).status).toBe(201);
  return token;
}

const PAYMENT_TITLES = /Payment/;
function messagesTo(token: string): PushMessage[] {
  return sent.mock.calls
    .flatMap(([messages]) => messages)
    .filter((message) => message.to === token && PAYMENT_TITLES.test(message.title));
}

afterAll(async () => {
  for (const id of users) await cleanupUser(id);
});

beforeEach(() => sent.mockClear());

describe("the coach's UPI ID", () => {
  it("is stored lowercase, refused when it isn't a UPI ID, and cleared with a blank", async () => {
    const coach = await registerUser("COACH", "upi-coach");
    users.push(coach.id);

    const saved = await api.patch("/v1/coach/profile").set(auth(coach)).send({ upiId: " Aman.Fit@OKAxis " });
    expect(saved.status).toBe(200);
    expect(saved.body.profile.upiId).toBe("aman.fit@okaxis");

    expect((await api.patch("/v1/coach/profile").set(auth(coach)).send({ upiId: "not a upi id" })).status).toBe(400);

    const cleared = await api.patch("/v1/coach/profile").set(auth(coach)).send({ upiId: "" });
    expect(cleared.body.profile.upiId).toBeNull();
  });
});

describe("a period's fee", () => {
  it("is due from the start date, overdue after the grace days, and paid when recorded as already paid", async () => {
    const { coach, client } = await pair("fee-status");

    expect((await period(coach, client, { startDate: dateKey(0), endDate: dateKey(30), amountInr: 4500 })).paymentStatus).toBe("DUE");
    expect((await period(coach, client, { startDate: dateKey(-10), endDate: dateKey(20), amountInr: 4500 })).paymentStatus).toBe("OVERDUE");
    expect((await period(coach, client, { startDate: dateKey(-10), endDate: dateKey(20) })).paymentStatus).toBe("NONE");

    const paid = await period(coach, client, { startDate: dateKey(-10), endDate: dateKey(20), amountInr: 4500, alreadyPaid: true });
    expect(paid.paymentStatus).toBe("PAID");
    expect(paid.receiptNumber).toMatch(/^CF-[A-Z0-9]{8}$/);
  });

  it("shows the client the amount and their coach's UPI ID", async () => {
    const { coach, client } = await pair("fee-client");
    await api.patch("/v1/coach/profile").set(auth(coach)).send({ upiId: "coach@upi" });
    await period(coach, client, { startDate: dateKey(0), endDate: dateKey(30), amountInr: 3000 });

    const res = await api.get("/v1/client/subscription").set(auth(client));

    expect(res.body.subscription).toMatchObject({ amountInr: 3000, paymentStatus: "DUE", coach: { id: coach.id, upiId: "coach@upi" } });
  });

  it("hides a previous coach's periods once the client has moved on", async () => {
    const { coach, client } = await pair("fee-moved");
    await period(coach, client, { startDate: dateKey(0), endDate: dateKey(30), amountInr: 3000 });
    const next = await registerUser("COACH", "fee-moved-next");
    users.push(next.id);
    await createAcceptedInvite(next, client);

    expect((await api.get("/v1/client/subscription").set(auth(client))).body.subscription).toBeNull();
  });
});

describe("paying", () => {
  it("goes from the client's 'I've paid' to the coach confirming it, with a push each way", async () => {
    const { coach, client } = await pair("pay-flow");
    const coachToken = await withToken(coach);
    const clientToken = await withToken(client);
    const { id } = await period(coach, client, { startDate: dateKey(0), endDate: dateKey(30), amountInr: 4500 });

    const reported = await api.post(`/v1/client/subscription/${id}/report-paid`).set(auth(client)).send({ reference: "412345678901" });
    expect(reported.status).toBe(200);
    expect(reported.body.subscription).toMatchObject({ paymentStatus: "REPORTED", paymentReference: "412345678901" });
    await vi.waitFor(() => {
      expect(messagesTo(coachToken)).toEqual([expect.objectContaining({ title: "Payment to confirm", body: expect.stringContaining("₹4,500") })]);
    });
    const roster = await api.get("/v1/coach/invites?status=ACCEPTED").set(auth(coach));
    expect(roster.body.invites.find((invite: { clientId: string }) => invite.clientId === client.id).attention).toContain("PAYMENT_TO_CONFIRM");

    const confirmed = await api.post(`/v1/coach/clients/${client.id}/subscriptions/${id}/payment`).set(auth(coach)).send({ paid: true });
    expect(confirmed.body.subscription).toMatchObject({ paymentStatus: "PAID", receiptNumber: expect.stringMatching(/^CF-/) });
    await vi.waitFor(() => {
      expect(messagesTo(clientToken)).toEqual([expect.objectContaining({ title: "Payment received" })]);
    });

    expect((await api.post(`/v1/client/subscription/${id}/report-paid`).set(auth(client)).send({})).status).toBe(409);
  });

  it("lets the coach undo a confirmation, which clears the client's report too", async () => {
    const { coach, client } = await pair("pay-undo");
    const { id } = await period(coach, client, { startDate: dateKey(0), endDate: dateKey(30), amountInr: 1000 });
    await api.post(`/v1/client/subscription/${id}/report-paid`).set(auth(client)).send({});
    await api.post(`/v1/coach/clients/${client.id}/subscriptions/${id}/payment`).set(auth(coach)).send({ paid: true });

    const undone = await api.post(`/v1/coach/clients/${client.id}/subscriptions/${id}/payment`).set(auth(coach)).send({ paid: false });

    expect(undone.body.subscription).toMatchObject({ paymentStatus: "DUE", clientReportedPaidAt: null, receiptNumber: null });
  });

  it("refuses with no fee set, and for someone else's period", async () => {
    const { coach, client } = await pair("pay-refuse");
    const other = await registerUser("CLIENT", "pay-refuse-other");
    users.push(other.id);
    const free = await period(coach, client, { startDate: dateKey(0), endDate: dateKey(30) });
    const priced = await period(coach, client, { startDate: dateKey(1), endDate: dateKey(31), amountInr: 1000 });

    expect((await api.post(`/v1/client/subscription/${free.id}/report-paid`).set(auth(client)).send({})).status).toBe(409);
    expect((await api.post(`/v1/coach/clients/${client.id}/subscriptions/${free.id}/payment`).set(auth(coach)).send({ paid: true })).status).toBe(409);
    expect((await api.post(`/v1/client/subscription/${priced.id}/report-paid`).set(auth(other)).send({})).status).toBe(404);
  });
});

describe("payment reminders", () => {
  it("reminds the client once when a fee falls due, and both sides once when it's overdue", async () => {
    const { coach, client } = await pair("pay-remind");
    const coachToken = await withToken(coach);
    const clientToken = await withToken(client);
    const due = await period(coach, client, { startDate: dateKey(0), endDate: dateKey(30), amountInr: 2000 });

    await runPaymentReminders();
    await runPaymentReminders();
    expect(messagesTo(clientToken)).toEqual([expect.objectContaining({ title: "Payment due" })]);

    // Five days in and still unpaid.
    await prisma.subscription.update({ where: { id: due.id }, data: { startDate: new Date(`${dateKey(-5)}T00:00:00.000Z`) } });
    sent.mockClear();
    await runPaymentReminders();
    await runPaymentReminders();
    expect(messagesTo(clientToken)).toEqual([expect.objectContaining({ title: "Payment overdue" })]);
    expect(messagesTo(coachToken)).toEqual([expect.objectContaining({ title: "Payment overdue" })]);
  });

  it("leaves alone a fee the client says they've paid, or one already paid", async () => {
    const { coach, client } = await pair("pay-quiet");
    const clientToken = await withToken(client);
    const reported = await period(coach, client, { startDate: dateKey(-5), endDate: dateKey(25), amountInr: 2000 });
    await api.post(`/v1/client/subscription/${reported.id}/report-paid`).set(auth(client)).send({});
    await prisma.subscription.create({
      data: {
        coachId: coach.id,
        clientId: client.id,
        startDate: new Date(`${dateKey(-5)}T00:00:00.000Z`),
        endDate: new Date(`${dateKey(25)}T00:00:00.000Z`),
        amountInr: 2000,
        paidAt: new Date(),
      },
    });
    sent.mockClear();

    await runPaymentReminders();

    expect(messagesTo(clientToken)).toEqual([]);
  });
});
