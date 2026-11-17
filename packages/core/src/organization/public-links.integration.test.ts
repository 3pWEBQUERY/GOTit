import { getDb, type ProviderStatus } from "@app/db";
import type * as Jobs from "@app/jobs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@app/jobs", async (importOriginal) => ({
  ...(await importOriginal<typeof Jobs>()),
  enqueue: async () => undefined,
  createRedisConnection: () => ({ publish: async () => 0 }),
}));

const org = await import("./index");
const { resolveMediaDelivery } = await import("../media/delivery-service");
const { reindexProfile } = await import("../search/indexer");

/**
 * Öffentliche Clubseite und Querverweise (Schritt 1.11, Oberfläche): Anbieter
 * pro Standort, «Verknüpft mit» auf dem Profil, Zahl offener Einladungen und
 * Auslieferung der Medien einer Organisation. Fiktive Daten, danach gelöscht.
 */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];
const organizationIds: string[] = [];
const visitor = { kind: "visitor" } as const;
let published = { id: "", slug: "" };
let draft = { id: "", slug: "" };
let locationId = "";
const providers: Record<string, { userId: string; slug: string; id: string }> =
  {};

async function user(label: string) {
  const id = `it_orgpub_${label}_${run}`;
  users.push(id);
  await db.user.create({
    data: {
      id,
      name: "Fiktiv",
      email: `${id}@fiktiv.test`,
      emailVerified: true,
      ageConfirmedAt: new Date(),
    },
  });
  return id;
}

async function provider(label: string, status: ProviderStatus = "PUBLISHED") {
  const userId = await user(label);
  const profile = await db.providerProfile.create({
    data: {
      userId,
      slug: `fiktiv-orgpub-${label}-${run}`,
      displayName: `Fiktiv ${label}`,
      status,
      publishedAt: new Date(),
    },
  });
  await db.identityCheck.create({
    data: {
      userId,
      provider: "test",
      externalRef: `it-orgpub-${label}-${run}`,
      status: "APPROVED",
      ageOver18: true,
      livenessPassed: true,
      checkedAt: new Date(),
      expiresAt: new Date(Date.now() + 100 * 86_400_000),
    },
  });
  await db.profileReview.create({
    data: {
      providerProfileId: profile.id,
      decision: "APPROVED",
      decidedAt: new Date(),
    },
  });
  await reindexProfile(profile.id);
  providers[label] = { userId, slug: profile.slug, id: profile.id };
  return providers[label];
}

async function organization(label: string, status: "PUBLISHED" | "DRAFT") {
  const row = await db.organization.create({
    data: {
      slug: `fiktiv-orgpub-${label}-${run}`,
      name: `Fiktiv ${label}`,
      kind: "CLUB",
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
    select: { id: true, slug: true },
  });
  organizationIds.push(row.id);
  return row;
}

async function link(
  organizationId: string,
  providerId: string,
  status: "ACTIVE" | "INVITED",
  location: string | null = null,
) {
  return db.organizationLink.create({
    data: {
      organizationId,
      providerProfileId: providerId,
      status,
      locationId: location,
      invitedById: users[0] ?? "",
    },
    select: { id: true },
  });
}

beforeAll(async () => {
  published = await organization("club", "PUBLISHED");
  draft = await organization("entwurf", "DRAFT");
  locationId = (
    await db.location.create({
      data: {
        organizationId: published.id,
        name: "Fiktiv Standort",
        regionId: (
          await db.region.findUniqueOrThrow({
            where: { slug: "stadt-zuerich" },
          })
        ).id,
      },
      select: { id: true },
    })
  ).id;
  const atLocation = await provider("standort");
  const general = await provider("allgemein");
  const invited = await provider("eingeladen");
  const paused = await provider("pausiert");
  await db.providerProfile.update({
    where: { id: paused.id },
    data: { status: "PAUSED" },
  });
  await link(published.id, atLocation.id, "ACTIVE", locationId);
  await link(published.id, general.id, "ACTIVE");
  await link(published.id, invited.id, "INVITED", locationId);
  await link(published.id, paused.id, "ACTIVE", locationId);
  await link(draft.id, general.id, "ACTIVE");
});

afterAll(async () => {
  await db.organization.deleteMany({ where: { id: { in: organizationIds } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
});

describe("Öffentliche Clubseite (v2 9.4)", () => {
  it("nennt pro Anbieter die Standorte seiner aktiven Verknüpfung; eingeladene und pausierte fehlen", async () => {
    const page = await org.getPublicOrganization(published.slug, visitor, "de");
    expect(page?.verifiedAt).toBeInstanceOf(Date);
    const shown = Object.fromEntries(
      (page?.providers ?? []).map((entry) => [entry.slug, entry.locationIds]),
    );
    expect(shown).toEqual({
      [providers.standort?.slug ?? ""]: [locationId],
      [providers.allgemein?.slug ?? ""]: [],
    });
  });

  it("zählt in der Liste nur Anbieter, die auf der Seite erscheinen", async () => {
    const list = await org.listPublicOrganizations("de");
    const row = list.find((entry) => entry.slug === published.slug);
    expect(row?.providerCount).toBe(2);
    expect(list.some((entry) => entry.slug === draft.slug)).toBe(false);
  });

  it("ein Kanton findet die Standorte in seinen Städten", async () => {
    const slugs = async (regionSlug: string) =>
      (await org.listPublicOrganizations("de", { regionSlug })).map(
        (entry) => entry.slug,
      );
    expect(await slugs("stadt-zuerich")).toContain(published.slug);
    expect(await slugs("zuerich")).toContain(published.slug);
    expect(await slugs("bern")).not.toContain(published.slug);
  });
});

describe("Querverweis auf dem Profil (v2 8.2)", () => {
  it("nur veröffentlichte Organisationen mit aktiver Verknüpfung", async () => {
    const general = await org.listPublicOrganizationsOfProvider(
      providers.allgemein?.slug ?? "",
      "de",
    );
    expect(general.map((entry) => entry.slug)).toEqual([published.slug]);
    expect(
      await org.listPublicOrganizationsOfProvider(
        providers.eingeladen?.slug ?? "",
        "de",
      ),
    ).toEqual([]);
    expect(
      await org.listPublicOrganizationsOfProvider("kein slug", "de"),
    ).toEqual([]);
  });
});

describe("Offene Einladungen (v2 7.6)", () => {
  it("zählt nur Einladungen an das eigene Profil", async () => {
    expect(
      await org.countOpenInvitations(providers.eingeladen?.userId ?? ""),
    ).toBe(1);
    expect(
      await org.countOpenInvitations(providers.standort?.userId ?? ""),
    ).toBe(0);
  });
});

describe("Medien einer Organisation (Entscheid 0018)", () => {
  it("öffentlich nur, solange die Organisation veröffentlicht ist", async () => {
    const owner = users[0] ?? "";
    const create = async (organizationId: string, label: string) => {
      const media = await db.mediaAsset.create({
        data: {
          ownerUserId: owner,
          organizationId,
          status: "PUBLISHED",
          visibility: "PUBLIC",
          originalKey: `it-orgpub-${label}-${run}`,
          rightsConfirmedAt: new Date(),
          width: 800,
          height: 1000,
          variants: {
            create: {
              name: "w640.webp",
              width: 640,
              height: 800,
              format: "webp",
              key: `it-orgpub-${label}-${run}.webp`,
              bytes: 1,
            },
          },
        },
        select: { id: true },
      });
      return media.id;
    };
    const shown = await create(published.id, "sichtbar");
    const hidden = await create(draft.id, "entwurf");
    expect(await resolveMediaDelivery(shown, "w640.webp", null)).toMatchObject({
      access: "public",
    });
    expect(await resolveMediaDelivery(hidden, "w640.webp", null)).toBeNull();
    expect(
      await resolveMediaDelivery(hidden, "w640.webp", owner),
    ).toMatchObject({
      access: "private",
    });
  });
});
