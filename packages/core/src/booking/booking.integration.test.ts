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

/** Termine gegen Postgres (Abnahme 20.5 aus v1.0, Schritt 1.9). Fiktive Konten, danach gelöscht. */
const db = getDb();
const run = `${Date.now()}`;
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

describe("Anfrage stellen (20.5 «Verfügbarkeiten sind korrekt»)", () => {
  it("nur in verfügbaren Zeiten, nicht zu kurzfristig, nicht doppelt offen", async () => {
    expect(
      await booking.createBookingRequest(
        account(member),
        anbieter.slug,
        request("2027-01-15T06:00:00Z"),
        now,
      ),
    ).toEqual({ ok: false, reason: "unavailable" });
    expect(
      await booking.createBookingRequest(
        account(member),
        anbieter.slug,
        request("2027-01-14T10:00:00Z"),
        now,
      ),
    ).toEqual({ ok: false, reason: "too-soon" });
    expect(
      await booking.createBookingRequest(
        account(member),
        anbieter.slug,
        { ...request("2027-01-15T17:00:00Z"), durationMinutes: 45 },
        now,
      ),
    ).toEqual({ ok: false, reason: "invalid" });
    const created = await booking.createBookingRequest(
      account(member),
      anbieter.slug,
      request("2027-01-15T17:00:00Z"),
      now,
    );
    expect(created.ok).toBe(true);
    expect(
      await booking.createBookingRequest(
        account(member),
        anbieter.slug,
        request("2027-01-16T17:00:00Z"),
        now,
      ),
    ).toEqual({ ok: false, reason: "duplicate" });
    expect(mails.at(-1)).toMatchObject({
      template: "booking-new",
      to: `${anbieter.userId}@fiktiv.test`,
    });
    expect(mails.at(-1)?.url).toMatch(/\/de\/studio\/anfragen\//);
    expect(mails.at(-1)?.url).not.toContain("Fiktive");
  });

  it("nicht beim eigenen Profil, nicht ohne Anfragen, nicht als Besucher", async () => {
    expect(
      await booking.createBookingRequest(
        account(anbieter.userId),
        anbieter.slug,
        request("2027-01-15T17:00:00Z"),
        now,
      ),
    ).toEqual({ ok: false, reason: "own-profile" });
    expect(
      await booking.createBookingRequest(
        { kind: "visitor" },
        anbieter.slug,
        request("2027-01-15T17:00:00Z"),
        now,
      ),
    ).toEqual({ ok: false, reason: "not-allowed" });
    const closed = await provider("geschlossen");
    await db.providerProfile.update({
      where: { id: closed.profileId },
      data: { allowBookingRequests: false },
    });
    expect(
      await booking.createBookingRequest(
        account(member),
        closed.slug,
        request("2027-01-15T17:00:00Z"),
        now,
      ),
    ).toEqual({ ok: false, reason: "not-allowed" });
  });
});

describe("Annehmen, ablehnen, absagen, Gegenvorschlag (20.5)", () => {
  it("Gegenvorschlag hin und zurück, dann annehmen; jeder Schritt im Verlauf", async () => {
    const other = await user("verhandler");
    const created = await booking.createBookingRequest(
      account(other),
      anbieter.slug,
      request("2027-01-18T17:00:00Z"),
      now,
    );
    if (!created.ok) throw new Error(created.reason);
    expect(
      await booking.actOnBookingRequest(
        account(other),
        created.requestId,
        { action: "accept" },
        now,
      ),
    ).toEqual({ ok: false, reason: "not-allowed" });
    expect(
      await booking.actOnBookingRequest(
        account(anbieter.userId),
        created.requestId,
        {
          action: "counter",
          startsAt: "2027-01-18T19:00:00Z",
          durationMinutes: 90,
        },
        now,
      ),
    ).toEqual({ ok: true, status: "NEGOTIATING" });
    expect(
      await booking.actOnBookingRequest(
        account(other),
        created.requestId,
        {
          action: "counter",
          startsAt: "2027-01-18T05:00:00Z",
          durationMinutes: 60,
        },
        now,
      ),
    ).toEqual({ ok: false, reason: "unavailable" });
    expect(
      await booking.actOnBookingRequest(
        account(other),
        created.requestId,
        { action: "accept" },
        now,
      ),
    ).toEqual({ ok: true, status: "CONFIRMED" });
    const detail = await booking.getRequestDetail(
      other,
      created.requestId,
      "de",
      now,
    );
    expect(
      detail?.events.map(
        (event) => `${event.actorRole}:${event.action}:${event.toStatus}`,
      ),
    ).toEqual([
      "MEMBER:created:REQUESTED",
      "PROVIDER:counter:NEGOTIATING",
      "MEMBER:accept:CONFIRMED",
    ]);
    expect([
      detail?.startsAt.toISOString(),
      detail?.endsAt.toISOString(),
    ]).toEqual(["2027-01-18T19:00:00.000Z", "2027-01-18T20:30:00.000Z"]);
  });

  it("ablehnen nur der Anbieter; danach ist nichts mehr möglich", async () => {
    const other = await user("abgelehnt");
    const created = await booking.createBookingRequest(
      account(other),
      anbieter.slug,
      request("2027-01-19T17:00:00Z"),
      now,
    );
    if (!created.ok) throw new Error(created.reason);
    expect(
      await booking.actOnBookingRequest(
        account(other),
        created.requestId,
        { action: "decline" },
        now,
      ),
    ).toEqual({ ok: false, reason: "not-allowed" });
    expect(
      await booking.actOnBookingRequest(
        account(anbieter.userId),
        created.requestId,
        { action: "decline", reason: "Fiktiv" },
        now,
      ),
    ).toEqual({ ok: true, status: "DECLINED" });
    expect(
      await booking.actOnBookingRequest(
        account(anbieter.userId),
        created.requestId,
        { action: "cancel" },
        now,
      ),
    ).toEqual({ ok: false, reason: "not-allowed" });
  });

  it("Absagen ist in jedem offenen und bestätigten Status für beide Seiten möglich (Abnahme 1.9)", async () => {
    let day = 20;
    for (const status of ["REQUESTED", "NEGOTIATING", "CONFIRMED"] as const) {
      for (const by of ["MEMBER", "PROVIDER"] as const) {
        for (const action of ["cancel", "cancel-safety"] as const) {
          const other = await user(`absage${day}${by}${action}`.toLowerCase());
          const created = await booking.createBookingRequest(
            account(other),
            anbieter.slug,
            request(`2027-02-${String(day).padStart(2, "0")}T13:00:00Z`),
            now,
          );
          if (!created.ok)
            throw new Error(`${status} ${by}: ${created.reason}`);
          if (status !== "REQUESTED")
            await booking.actOnBookingRequest(
              account(anbieter.userId),
              created.requestId,
              {
                action: "counter",
                startsAt: `2027-02-${String(day).padStart(2, "0")}T15:00:00Z`,
                durationMinutes: 60,
              },
              now,
            );
          if (status === "CONFIRMED")
            expect(
              (
                await booking.actOnBookingRequest(
                  account(other),
                  created.requestId,
                  { action: "accept" },
                  now,
                )
              ).ok,
            ).toBe(true);
          const actor = by === "MEMBER" ? other : anbieter.userId;
          expect(
            await booking.actOnBookingRequest(
              account(actor),
              created.requestId,
              { action, reason: "" },
              now,
            ),
          ).toEqual({ ok: true, status: "CANCELLED" });
          day += 1;
        }
      }
    }
  }, 60_000);
});
