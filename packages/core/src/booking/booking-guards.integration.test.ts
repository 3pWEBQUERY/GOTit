import { getDb } from "@app/db";
import type * as Jobs from "@app/jobs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Viewer } from "../identity/types";

const mails = vi.hoisted(
  () => [] as { to: string; template: string; url: string }[],
);
vi.mock("@app/jobs", async (importOriginal) => ({
  ...(await importOriginal<typeof Jobs>()),
  enqueue: async (
    _definition: unknown,
    payload: { to: string; template: string; url: string },
  ) => void mails.push(payload),
  createRedisConnection: () => ({ publish: async () => 0 }),
}));

const booking = await import("./index");

/** Termine gegen Postgres, Teil 2: Doppelbuchungen, Schutz, Ablauf. (Abnahme 20.5 aus v1.0, Schritt 1.9). Fiktive Konten, danach gelöscht. */
const db = getDb();
const run = `${Date.now()}b`;
const users: string[] = [];
const account = (id: string): Viewer => ({
  kind: "account",
  userId: id,
  name: "Fiktiv",
  ageConfirmed: true,
  provider: null,
  organizations: [],
});
// Ein fester Donnerstag in der Zukunft, 10:00 Zürich, als «jetzt».
const now = new Date("2027-01-14T09:00:00Z");

async function user(label: string) {
  const id = `it_book_${label}_${run}`;
  users.push(id);
  await db.user.create({
    data: {
      id,
      name: "Fiktiv",
      email: `${id}@fiktiv.test`,
      emailVerified: true,
      ageConfirmedAt: new Date(),
      username: `f_${label}_${run}`.slice(0, 30),
    },
  });
  return id;
}

async function provider(
  label: string,
  settings: { exclusiveBooking?: boolean; bufferMinutes?: number } = {},
) {
  const id = await user(label);
  const profile = await db.providerProfile.create({
    data: {
      userId: id,
      slug: `fiktiv-book-${label}-${run}`,
      displayName: `Fiktiv ${label}`,
      status: "PUBLISHED",
    },
  });
  await db.identityCheck.create({
    data: {
      userId: id,
      provider: "test",
      externalRef: `it-book-${label}-${run}`,
      status: "APPROVED",
      ageOver18: true,
      livenessPassed: true,
      checkedAt: new Date(),
      expiresAt: new Date("2028-01-01"),
    },
  });
  await db.profileReview.create({
    data: {
      providerProfileId: profile.id,
      decision: "APPROVED",
      decidedAt: new Date(),
    },
  });
  expect(
    await booking.saveCalendarSettings(id, {
      timeZone: "Europe/Zurich",
      bufferMinutes: settings.bufferMinutes ?? 0,
      exclusiveBooking: settings.exclusiveBooking ?? true,
      requestTtlHours: 48,
      minNoticeHours: 2,
    }),
  ).toEqual({ ok: true });
  // Jeden Tag 12–22 Uhr.
  expect(
    await booking.saveWeeklyWindows(
      id,
      [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        startMinute: 12 * 60,
        endMinute: 22 * 60,
      })),
    ),
  ).toEqual({ ok: true });
  return { userId: id, slug: profile.slug, profileId: profile.id };
}

const request = (startsAt: string, durationMinutes = 60) => ({
  startsAt,
  durationMinutes,
  message: "Fiktive Anfrage.",
});

let member = "";
let anbieter: Awaited<ReturnType<typeof provider>>;

beforeAll(async () => {
  member = await user("mitglied");
  anbieter = await provider("anbieter", { bufferMinutes: 30 });
});

afterAll(async () => {
  await db.conversation.deleteMany({
    where: { participants: { some: { userId: { in: users } } } },
  });
  await db.user.deleteMany({ where: { id: { in: users } } });
});

describe("Doppelbuchungen (20.5)", () => {
  it("bei Exklusivbelegung verhindert, auch bei gleichzeitigen Bestätigungen; Puffer zählt", async () => {
    const a = await user("doppel-a");
    const b = await user("doppel-b");
    const ra = await booking.createBookingRequest(
      account(a),
      anbieter.slug,
      request("2027-03-10T17:00:00Z"),
      now,
    );
    const rb = await booking.createBookingRequest(
      account(b),
      anbieter.slug,
      { ...request("2027-03-10T18:15:00Z"), durationMinutes: 60 },
      now,
    );
    if (!ra.ok || !rb.ok) throw new Error("Anfrage fehlgeschlagen");
    const results = await Promise.all([
      booking.actOnBookingRequest(
        account(anbieter.userId),
        ra.requestId,
        { action: "accept" },
        now,
      ),
      booking.actOnBookingRequest(
        account(anbieter.userId),
        rb.requestId,
        { action: "accept" },
        now,
      ),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      { ok: false, reason: "conflict" },
    ]);
  });

  it("ohne Exklusivbelegung dürfen sich Termine überschneiden", async () => {
    const free = await provider("ohneexklusiv", { exclusiveBooking: false });
    const a = await user("frei-a");
    const b = await user("frei-b");
    const ra = await booking.createBookingRequest(
      account(a),
      free.slug,
      request("2027-03-11T17:00:00Z"),
      now,
    );
    const rb = await booking.createBookingRequest(
      account(b),
      free.slug,
      request("2027-03-11T17:30:00Z"),
      now,
    );
    if (!ra.ok || !rb.ok) throw new Error("Anfrage fehlgeschlagen");
    expect(
      (
        await booking.actOnBookingRequest(
          account(free.userId),
          ra.requestId,
          { action: "accept" },
          now,
        )
      ).ok,
    ).toBe(true);
    expect(
      (
        await booking.actOnBookingRequest(
          account(free.userId),
          rb.requestId,
          { action: "accept" },
          now,
        )
      ).ok,
    ).toBe(true);
  });

  it("zwei gleichzeitige Aktionen auf dieselbe Anfrage: genau eine gewinnt", async () => {
    const c = await user("parallel");
    const rc = await booking.createBookingRequest(
      account(c),
      anbieter.slug,
      request("2027-03-12T17:00:00Z"),
      now,
    );
    if (!rc.ok) throw new Error(rc.reason);
    const results = await Promise.all([
      booking.actOnBookingRequest(
        account(anbieter.userId),
        rc.requestId,
        { action: "accept" },
        now,
      ),
      booking.actOnBookingRequest(
        account(c),
        rc.requestId,
        { action: "cancel" },
        now,
      ),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });
});

describe("Private Terminangaben sind geschützt (20.5)", () => {
  it("Dritte sehen und ändern nichts; die Notiz sieht nur der Anbieter", async () => {
    const owner = await user("privat");
    const created = await booking.createBookingRequest(
      account(owner),
      anbieter.slug,
      request("2027-03-15T17:00:00Z"),
      now,
    );
    if (!created.ok) throw new Error(created.reason);
    expect(
      await booking.setProviderNote(
        anbieter.userId,
        created.requestId,
        "Private Notiz",
      ),
    ).toBe(true);
    expect(
      await booking.setProviderNote(owner, created.requestId, "fremd"),
    ).toBe(false);
    expect(
      (await booking.getRequestDetail(owner, created.requestId, "de", now))
        ?.providerNote,
    ).toBeNull();
    expect(
      (
        await booking.getRequestDetail(
          anbieter.userId,
          created.requestId,
          "de",
          now,
        )
      )?.providerNote,
    ).toBe("Private Notiz");
    for (const outsider of [
      await user("dritter"),
      (await provider("drittanbieter")).userId,
    ]) {
      expect(
        await booking.getRequestDetail(outsider, created.requestId, "de", now),
      ).toBeNull();
      expect(
        await booking.actOnBookingRequest(
          account(outsider),
          created.requestId,
          { action: "cancel" },
          now,
        ),
      ).toEqual({ ok: false, reason: "not-found" });
      expect(
        (await booking.listRequests(outsider, "MEMBER", "offen", now)).length +
          (await booking.listRequests(outsider, "PROVIDER", "offen", now))
            .length,
      ).toBe(0);
      expect(
        await booking.requestsInConversation(outsider, created.conversationId),
      ).toEqual([]);
    }
    const slots = await booking.publicFreeSlots(anbieter.profileId, now, 3);
    expect(JSON.stringify(slots)).not.toContain("Private Notiz");
  });
});

describe("Ablauf, Stattgefunden und Erinnerungen", () => {
  it("offene Anfragen laufen ab; bestätigte bekommen einmal eine Erinnerung; danach stattgefunden oder strittig", async () => {
    const owner = await user("ablauf");
    const created = await booking.createBookingRequest(
      account(owner),
      anbieter.slug,
      request("2027-03-20T17:00:00Z"),
      now,
    );
    if (!created.ok) throw new Error(created.reason);
    expect(
      await booking.expireOpenRequests(new Date("2027-01-17T09:00:00Z")),
    ).toBeGreaterThan(0);
    expect(
      (await booking.getRequestDetail(owner, created.requestId, "de", now))
        ?.status,
    ).toBe("EXPIRED");

    const confirmed = await user("erinnert");
    const second = await booking.createBookingRequest(
      account(confirmed),
      anbieter.slug,
      request("2027-01-16T17:00:00Z"),
      now,
    );
    if (!second.ok) throw new Error(second.reason);
    await booking.actOnBookingRequest(
      account(anbieter.userId),
      second.requestId,
      { action: "accept" },
      now,
    );
    const before = mails.length;
    const reminderTime = new Date("2027-01-15T18:00:00Z");
    expect(await booking.sendUpcomingReminders(reminderTime)).toBeGreaterThan(
      0,
    );
    expect(
      mails
        .slice(before)
        .filter((mail) => mail.template === "booking-upcoming")
        .map((mail) => mail.to)
        .sort(),
    ).toEqual(
      expect.arrayContaining([
        `${confirmed}@fiktiv.test`,
        `${anbieter.userId}@fiktiv.test`,
      ]),
    );
    const afterFirst = mails.length;
    await booking.sendUpcomingReminders(reminderTime);
    expect(
      mails
        .slice(afterFirst)
        .filter((mail) => mail.to === `${confirmed}@fiktiv.test`),
    ).toHaveLength(0);
    const after = new Date("2027-01-16T19:00:00Z");
    expect(
      await booking.actOnBookingRequest(
        account(confirmed),
        second.requestId,
        { action: "cancel" },
        after,
      ),
    ).toEqual({ ok: false, reason: "not-allowed" });
    expect(
      await booking.actOnBookingRequest(
        account(confirmed),
        second.requestId,
        { action: "complete" },
        after,
      ),
    ).toEqual({ ok: true, status: "COMPLETED" });
    expect(
      await booking.actOnBookingRequest(
        account(anbieter.userId),
        second.requestId,
        { action: "dispute", reason: "Fiktiv" },
        after,
      ),
    ).toEqual({ ok: true, status: "DISPUTED" });
  });

  it("E-Mails folgen der Kanalwahl in den Einstellungen", async () => {
    const quiet = await provider("still");
    await db.userPreference.create({
      data: {
        userId: quiet.userId,
        notifications: { bookingRequest: { email: false } },
      },
    });
    const before = mails.length;
    const created = await booking.createBookingRequest(
      account(member),
      quiet.slug,
      request("2027-01-20T17:00:00Z"),
      now,
    );
    expect(created.ok).toBe(true);
    expect(
      mails
        .slice(before)
        .filter((mail) => mail.to === `${quiet.userId}@fiktiv.test`),
    ).toHaveLength(0);
  });
});
