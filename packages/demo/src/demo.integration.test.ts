import { getDb } from "@app/db";
import type * as Jobs from "@app/jobs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Ohne Queue: Die Kernfunktionen sollen hier nichts in Redis einreihen.
vi.mock("@app/jobs", async (importOriginal) => ({ ...(await importOriginal<typeof Jobs>()), enqueue: async () => undefined }));

const { checkDemoEnvironment } = await import("./guard");
const { resetDemo, seedDemo } = await import("./seed");
const { EMPTY_QUERY, searchPort } = await import("@app/core/search");
const { getPublicProfile } = await import("@app/core/provider-profile");
const { publicFreeSlots } = await import("@app/core/booking");
const { getPublicOrganization } = await import("@app/core/organization");
const { listPublicReviews } = await import("@app/core/review");
const { rangeEndingToday, statsOverview } = await import("@app/core/stats");

/**
 * Lädt den Demo-Datensatz zweimal in die lokale Datenbank, prüft Sichtbarkeit,
 * Suche, Bilder und Bewertungen und entfernt danach alles mit `resetDemo`.
 * Achtung: Vorhandene Demo-Daten der lokalen Datenbank sind danach weg.
 * Pro Profil nur ein Bild, damit der Lauf kurz bleibt; die Pipeline ist dieselbe.
 */
const db = getDb();
const now = new Date();
const visitor = { kind: "visitor" } as const;
const password = "demo-passwort-nur-test";

async function counts() {
  const demo = { startsWith: "demo_" };
  return {
    users: await db.user.count({ where: { id: demo } }),
    profiles: await db.providerProfile.count({ where: { id: demo } }),
    organizations: await db.organization.count({ where: { slug: { startsWith: "demo-" } } }),
    links: await db.organizationLink.count({ where: { organizationId: demo } }),
    media: await db.mediaAsset.count({ where: { id: demo } }),
    variants: await db.mediaVariant.count({ where: { mediaId: demo } }),
    bookings: await db.bookingRequest.count({ where: { id: demo } }),
    reviews: await db.review.count({ where: { id: demo } }),
    messages: await db.message.count({ where: { conversationId: demo } }),
    favorites: await db.favorite.count({ where: { providerProfileId: demo } }),
    statEvents: await db.statEvent.count({ where: { providerProfileId: demo } }),
    search: await db.searchProfile.count({ where: { providerProfileId: demo } }),
    identity: await db.identityCheck.count({ where: { userId: demo } }),
  };
}

let first: Awaited<ReturnType<typeof counts>>;

beforeAll(async () => {
  expect(checkDemoEnvironment(process.env).ok).toBe(true);
  await seedDemo({ now, password, maxImagesPerOwner: 1 });
  first = await counts();
  await seedDemo({ now, password, maxImagesPerOwner: 1 });
});

afterAll(async () => {
  await resetDemo(db);
  await db.$disconnect();
});

describe("Demo-Daten", () => {
  it("ein zweiter Lauf verdoppelt nichts", async () => {
    expect(await counts()).toEqual(first);
    expect(first.profiles).toBe(24);
    expect(first.organizations).toBe(3);
    expect(first.users).toBe(24 + 10 + 3);
    expect(first.reviews).toBe(16);
    expect(first.search).toBe(22);
  });

  it("legt keine internen Rollen an", async () => {
    expect(await db.internalRoleAssignment.count({ where: { userId: { startsWith: "demo_" } } })).toBe(0);
  });

  it("Bilder sind durch die Pipeline gegangen und freigegeben", async () => {
    const media = await db.mediaAsset.findMany({ where: { id: { startsWith: "demo_" } }, select: { status: true, moderationNote: true, altText: true, width: true, _count: { select: { variants: true } } } });
    expect(media.length).toBe(27);
    for (const asset of media) {
      expect(asset.status).toBe("PUBLISHED");
      expect(asset.moderationNote).toBe("Demo");
      expect(asset.altText).toMatch(/^Abstraktes Bild/);
      expect(asset.width).toBeGreaterThan(0);
      expect(asset._count.variants).toBe(8);
    }
    expect(await db.mediaAsset.count({ where: { providerProfileId: { startsWith: "demo_" }, isCover: true } })).toBe(24);
  });

  it("Profile erscheinen in der Suche", async () => {
    const result = await searchPort.search({ ...EMPTY_QUERY, q: "Lina", region: "stadt-zuerich" }, { viewer: visitor, locale: "de", now });
    const lina = result.hits.find((hit) => hit.slug === "demo-lina");
    expect(lina?.cover).not.toBeNull();
    expect(lina?.photosChecked).toBe(true);
    const paused = await searchPort.search({ ...EMPTY_QUERY, q: "Valentina" }, { viewer: visitor, locale: "de", now });
    expect(paused.hits.some((hit) => hit.slug === "demo-valentina")).toBe(false);
  });

  it("öffentliches Profil mit Bildern, Preisen und Prüfhinweisen", async () => {
    const result = await getPublicProfile("demo-lina", visitor, { locale: "de", now });
    expect(result?.state).toBe("ready");
    if (!result || result.state === "members-only") throw new Error("unerwartet");
    expect(result.profile.media.length).toBeGreaterThan(0);
    expect(result.profile.trust.identity).not.toBeNull();
    expect(result.profile.rates.length).toBe(2);
    expect(result.profile.description?.endsWith("Demo-Profil, fiktiv.")).toBe(true);
    expect((await getPublicProfile("demo-valentina", visitor, { locale: "de", now }))?.state).toBe("paused");
    expect((await getPublicProfile("demo-sofia", visitor, { locale: "de", now }))?.state).toBe("members-only");
  });

  it("Bewertungen sind veröffentlicht, freie Zeiten vorhanden", async () => {
    const reviews = await listPublicReviews("demo_profile_lina");
    expect(reviews.total).toBe(3);
    const slots = await publicFreeSlots("demo_profile_lina", now);
    expect(slots.slots.length).toBeGreaterThan(0);
  });

  it("Organisationen sind veröffentlicht und zeigen verknüpfte Profile", async () => {
    const club = await getPublicOrganization("demo-club-lumen", visitor, "de", now);
    expect(club?.locations.length).toBe(2);
    expect(club?.providers.length).toBeGreaterThan(0);
  });

  it("Statistik zeigt Zahlen der letzten 30 Tage", async () => {
    const overview = await statsOverview("demo_profile_lina", rangeEndingToday(30, now));
    expect(overview.kpis.profileViews.value).toBeGreaterThan(0);
    expect(overview.funnel.impressions).toBeGreaterThan(0);
  });

  it("ohne Passwort keine Anmeldung", async () => {
    expect(await db.account.count({ where: { userId: { startsWith: "demo_" }, providerId: "credential" } })).toBe(37);
    await seedDemo({ now, password: null, maxImagesPerOwner: 1 });
    expect(await db.account.count({ where: { userId: { startsWith: "demo_" }, providerId: "credential" } })).toBe(0);
  });

  it("resetDemo entfernt alles", async () => {
    await resetDemo(db);
    const after = await counts();
    for (const value of Object.values(after)) expect(value).toBe(0);
  });
});
