import { getDb, type StatKind } from "@app/db";
import type * as Jobs from "@app/jobs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const seen = vi.hoisted(() => new Set<string>());
vi.mock("@app/jobs", async (importOriginal) => ({
  ...(await importOriginal<typeof Jobs>()),
  enqueue: async () => undefined,
  createRedisConnection: () => ({
    publish: async () => 0,
    set: async (key: string) => (seen.has(key) ? null : (seen.add(key), "OK")),
  }),
}));

const stats = await import("./index");
const { zonedToUtc } = await import("../booking/time-zone");

/**
 * Kennzahlen gegen Postgres (Abnahme 1.12: «Zahlen stimmen mit den
 * Rohereignissen eines Testdatensatzes überein»). Fiktives Profil, danach gelöscht.
 */
const db = getDb();
const run = `${Date.now()}`;
const userId = `it_stats_${run}`;
let profileId = "";
let otherProfileId = "";
// «Jetzt» liegt fest in der Zukunft, damit keine echten Ereignisse stören.
const now = new Date("2030-03-20T10:00:00Z");
const at = (day: string, hour: number) =>
  zonedToUtc(day, hour * 60, "Europe/Zurich");

// Testdatensatz: Tag → Art → Anzahl. Dazu Medien und Suchschlüssel.
const dataset: Record<string, Partial<Record<StatKind, number>>> = {
  "2030-03-14": { PROFILE_VIEW: 3, SEARCH_IMPRESSION: 10 },
  "2030-03-15": {
    PROFILE_VIEW: 5,
    CONTACT_ACTION: 1,
    SEARCH_IMPRESSION: 7,
    FAVORITE_ADDED: 2,
  },
  "2030-03-17": {
    PROFILE_VIEW: 2,
    BOOKING_REQUEST: 1,
    MEDIA_VIEW: 4,
    FAVORITE_REMOVED: 1,
  },
  "2030-03-19": {
    PROFILE_VIEW: 4,
    BOOKING_REQUEST: 1,
    BOOKING_CONFIRMED: 1,
    SEARCH_IMPRESSION: 6,
  },
  // Heute, noch nicht aggregiert.
  "2030-03-20": { PROFILE_VIEW: 1, SEARCH_IMPRESSION: 2 },
};

beforeAll(async () => {
  await db.user.create({
    data: {
      id: userId,
      name: "Fiktiv",
      email: `${userId}@fiktiv.test`,
      emailVerified: true,
    },
  });
  profileId = (
    await db.providerProfile.create({
      data: {
        userId,
        slug: `fiktiv-stats-${run}`,
        displayName: "Fiktiv Statistik",
        status: "PUBLISHED",
      },
      select: { id: true },
    })
  ).id;
  const other = `it_stats_anderes_${run}`;
  await db.user.create({
    data: {
      id: other,
      name: "Fiktiv",
      email: `${other}@fiktiv.test`,
      emailVerified: true,
    },
  });
  otherProfileId = (
    await db.providerProfile.create({
      data: {
        userId: other,
        slug: `fiktiv-stats-b-${run}`,
        displayName: "Fiktiv B",
        status: "PUBLISHED",
      },
      select: { id: true },
    })
  ).id;
  for (const [day, kinds] of Object.entries(dataset)) {
    for (const [kind, count] of Object.entries(kinds) as [StatKind, number][]) {
      for (let index = 0; index < count; index += 1) {
        await db.statEvent.create({
          data: {
            providerProfileId: profileId,
            kind,
            occurredAt: at(day, 8 + index),
            mediaId:
              kind === "MEDIA_VIEW"
                ? index % 2 === 0
                  ? "medium-a"
                  : "medium-b"
                : null,
            searchKey:
              kind === "SEARCH_IMPRESSION"
                ? index < 3
                  ? "ort=stadt-zuerich"
                  : "kategorie=massage"
                : null,
          },
        });
      }
    }
  }
  // Ein Ereignis um 23:30 Zürcher Zeit gehört zu diesem Tag, nicht zum nächsten (UTC wäre schon anders).
  await db.statEvent.create({
    data: {
      providerProfileId: profileId,
      kind: "CONTACT_ACTION",
      occurredAt: at("2030-03-17", 23.5),
    },
  });
  // Ein anderes Profil darf nicht mitzählen.
  await db.statEvent.create({
    data: {
      providerProfileId: otherProfileId,
      kind: "PROFILE_VIEW",
      occurredAt: at("2030-03-17", 9),
    },
  });
});

afterAll(async () => {
  await db.statAggregatedDay.deleteMany({
    where: { day: { gte: "2030-03-01", lte: "2030-03-31" } },
  });
  await db.user.deleteMany({
    where: { id: { in: [userId, `it_stats_anderes_${run}`] } },
  });
});

/** Erwartete Summen direkt aus dem Datensatz, ohne Datenbank. */
function expected(kind: StatKind, from: string, to: string): number {
  return Object.entries(dataset)
    .filter(([day]) => day >= from && day <= to)
    .reduce((sum, [, kinds]) => sum + (kinds[kind] ?? 0), 0);
}

describe("Zahlen stimmen mit den Rohereignissen überein (Abnahme 1.12)", () => {
  it("vor der Aggregation: alles aus den Rohereignissen", async () => {
    const overview = await stats.statsOverview(profileId, {
      from: "2030-03-14",
      to: "2030-03-20",
    });
    expect(overview.kpis.profileViews.value).toBe(
      expected("PROFILE_VIEW", "2030-03-14", "2030-03-20"),
    );
    expect(overview.funnel.impressions).toBe(
      expected("SEARCH_IMPRESSION", "2030-03-14", "2030-03-20"),
    );
  });

  it("nach der Aggregation: dieselben Zahlen, auch Tageswerte, Trichter, Medien und Suchen", async () => {
    const result = await stats.aggregatePendingDays(now);
    expect(result.days).toEqual(
      expect.arrayContaining([
        "2030-03-14",
        "2030-03-15",
        "2030-03-17",
        "2030-03-19",
      ]),
    );
    expect(result.days).not.toContain("2030-03-20");
    const range = { from: "2030-03-14", to: "2030-03-20" };
    const overview = await stats.statsOverview(profileId, range);
    expect(overview.kpis.profileViews.value).toBe(
      expected("PROFILE_VIEW", range.from, range.to),
    );
    expect(overview.kpis.contactActions.value).toBe(
      expected("CONTACT_ACTION", range.from, range.to) + 1,
    );
    expect(overview.kpis.bookingRequests.value).toBe(
      expected("BOOKING_REQUEST", range.from, range.to),
    );
    expect(overview.kpis.favoritesNet.value).toBe(
      expected("FAVORITE_ADDED", range.from, range.to) -
        expected("FAVORITE_REMOVED", range.from, range.to),
    );
    expect(overview.funnel).toEqual({
      impressions: expected("SEARCH_IMPRESSION", range.from, range.to),
      profileViews: expected("PROFILE_VIEW", range.from, range.to),
      contactActions: expected("CONTACT_ACTION", range.from, range.to) + 1,
      bookingRequests: expected("BOOKING_REQUEST", range.from, range.to),
      confirmed: expected("BOOKING_CONFIRMED", range.from, range.to),
    });
    expect(overview.viewsPerDay).toEqual([
      { day: "2030-03-14", value: 3 },
      { day: "2030-03-15", value: 5 },
      { day: "2030-03-16", value: 0 },
      { day: "2030-03-17", value: 2 },
      { day: "2030-03-18", value: 0 },
      { day: "2030-03-19", value: 4 },
      { day: "2030-03-20", value: 1 },
    ]);
    expect(overview.media).toEqual([
      { mediaId: "medium-a", views: 2 },
      { mediaId: "medium-b", views: 2 },
    ]);
    // Je Tag gehen die ersten drei Einblendungen an «ort=stadt-zuerich», der Rest an «kategorie=massage».
    expect(overview.searches).toEqual([
      { searchKey: "kategorie=massage", impressions: 7 + 4 + 3 },
      { searchKey: "ort=stadt-zuerich", impressions: 3 + 3 + 3 + 2 },
    ]);
  });

  it("eine zweite Aggregation ändert nichts; das andere Profil zählt nie mit", async () => {
    const before = await stats.statsOverview(profileId, {
      from: "2030-03-14",
      to: "2030-03-20",
    });
    await stats.aggregateDay("2030-03-17", now);
    expect(
      await stats.statsOverview(profileId, {
        from: "2030-03-14",
        to: "2030-03-20",
      }),
    ).toEqual(before);
    expect(
      (
        await stats.statsOverview(otherProfileId, {
          from: "2030-03-14",
          to: "2030-03-20",
        })
      ).kpis.profileViews.value,
    ).toBe(1);
  });

  it("Vergleich mit der Vorperiode und der laufende Tag wird nie aggregiert", async () => {
    const overview = await stats.statsOverview(profileId, {
      from: "2030-03-17",
      to: "2030-03-20",
    });
    expect(overview.kpis.profileViews).toEqual({
      value: 2 + 4 + 1,
      previous: 3 + 5,
    });
    await expect(stats.aggregateDay("2030-03-20", now)).rejects.toThrow();
  });

  it("Rohereignisse aggregierter Tage verschwinden nach der Frist, die Zahlen bleiben", async () => {
    const later = new Date("2030-03-25T10:00:00Z");
    const before = await stats.statsOverview(profileId, {
      from: "2030-03-14",
      to: "2030-03-19",
    });
    await stats.aggregatePendingDays(later);
    expect(
      await db.statEvent.count({
        where: {
          providerProfileId: profileId,
          occurredAt: { lt: at("2030-03-20", 0) },
        },
      }),
    ).toBe(0);
    expect(
      await stats.statsOverview(profileId, {
        from: "2030-03-14",
        to: "2030-03-19",
      }),
    ).toEqual(before);
  });
});

describe("Ohne Personenbezug", () => {
  it("ein Profilaufruf zählt einmal pro Besucher und Tag; gespeichert wird nur Profil, Art und Zeit", async () => {
    const day = new Date("2030-04-02T12:00:00Z");
    await stats.recordProfileView(profileId, "besucher-1", day);
    await stats.recordProfileView(profileId, "besucher-1", day);
    await stats.recordProfileView(profileId, "besucher-2", day);
    const rows = await db.statEvent.findMany({
      where: {
        providerProfileId: profileId,
        occurredAt: { gte: new Date("2030-04-01") },
      },
    });
    expect(rows).toHaveLength(2);
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual([
      "id",
      "kind",
      "mediaId",
      "occurredAt",
      "providerProfileId",
      "searchKey",
    ]);
    expect(JSON.stringify(rows)).not.toContain("besucher");
  });
});
