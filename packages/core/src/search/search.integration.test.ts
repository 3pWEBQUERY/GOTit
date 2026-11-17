import { getDb, type ProviderStatus } from "@app/db";
import type * as Jobs from "@app/jobs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Viewer } from "../identity/types";

vi.mock("@app/jobs", async (importOriginal) => ({
  ...(await importOriginal<typeof Jobs>()),
  enqueue: async () => undefined,
}));

const {
  EMPTY_QUERY,
  PAGE_SIZE,
  nearestRegion,
  parseSearchQuery,
  rebuildSearchIndex,
  reindexProfile,
  searchPort,
} = await import("./index");

/**
 * Suche gegen Postgres (Abnahme 20.3 aus v1.0, Schritt 1.7). Jeder Lauf legt
 * eine eigene, freigegebene fiktive Stadt und Kategorie an; die Abfragen
 * filtern darauf, damit andere Daten der Datenbank nicht stören.
 */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];
const visitor: Viewer = { kind: "visitor" };
const member: Viewer = {
  kind: "account",
  userId: `it_suche_mitglied_${run}`,
  name: "Fiktiv",
  ageConfirmed: true,
  provider: null,
  organizations: [],
};
const city = `fiktivstadt-${run}`;
const nearCity = `fiktivnah-${run}`;
const farCity = `fiktivfern-${run}`;
const category = `fiktivkategorie-${run}`;
const regionIds: string[] = [];
let categoryId = "";

interface Options {
  status?: ProviderStatus;
  identity?: "valid" | "expired" | "none";
  review?: "APPROVED" | "REJECTED" | "open" | "none";
  visibility?: "PUBLIC" | "MEMBERS";
  price?: number | null;
  languages?: string[];
  region?: string;
  withCategory?: boolean;
  photo?: boolean;
  publishedDaysAgo?: number;
  name?: string;
}

async function provider(
  label: string,
  options: Options = {},
): Promise<{ id: string; slug: string }> {
  const userId = `it_suche_${label}_${run}`;
  users.push(userId);
  const slug = `fiktiv-suche-${label}-${run}`;
  await db.user.create({
    data: {
      id: userId,
      name: `Fiktiv ${label}`,
      email: `${userId}@fiktiv.test`,
      emailVerified: true,
      accountType: "PROVIDER",
    },
  });
  const published = new Date(
    Date.now() - (options.publishedDaysAgo ?? 60) * 86_400_000,
  );
  const profile = await db.providerProfile.create({
    data: {
      userId,
      slug,
      displayName: options.name ?? `Fiktiv ${label}`,
      status: options.status ?? "PUBLISHED",
      visibility: options.visibility ?? "PUBLIC",
      languages: options.languages ?? ["de"],
      shortDescription: "Ein fiktiver Satz.",
      publishedAt: published,
      contentUpdatedAt: published,
    },
  });
  const region = await db.region.findUniqueOrThrow({
    where: { slug: options.region ?? city },
  });
  await db.providerRegion.create({
    data: { providerProfileId: profile.id, regionId: region.id },
  });
  if (options.withCategory)
    await db.providerService.create({
      data: { providerProfileId: profile.id, categoryId },
    });
  if (options.price !== null)
    await db.rateItem.create({
      data: {
        providerProfileId: profile.id,
        durationMinutes: 60,
        priceChf: options.price ?? 300,
      },
    });
  if (options.photo) {
    await db.mediaAsset.create({
      data: {
        ownerUserId: userId,
        providerProfileId: profile.id,
        status: "PUBLISHED",
        width: 10,
        height: 10,
        originalKey: `it/${userId}`,
        rightsConfirmedAt: new Date(),
        isCover: true,
      },
    });
  }
  const identity = options.identity ?? "valid";
  if (identity !== "none") {
    const expiresAt = new Date(
      Date.now() + (identity === "valid" ? 300 : -2) * 86_400_000,
    );
    await db.identityCheck.create({
      data: {
        userId,
        provider: "test",
        externalRef: `it-suche-${label}-${run}`,
        status: "APPROVED",
        ageOver18: true,
        livenessPassed: true,
        checkedAt: new Date(),
        expiresAt,
      },
    });
  }
  const review = options.review ?? "APPROVED";
  if (review !== "none") {
    await db.profileReview.create({
      data: {
        providerProfileId: profile.id,
        decision: review === "open" ? null : review,
        decidedAt: review === "open" ? null : new Date(),
      },
    });
  }
  await reindexProfile(profile.id);
  return { id: profile.id, slug };
}

const context = (viewer: Viewer = visitor) => ({
  viewer,
  locale: "de" as const,
});
const inCity = (raw: Record<string, string | string[]> = {}) =>
  parseSearchQuery({ ort: city, ...raw });
const slugs = async (
  raw: Record<string, string | string[]> = {},
  viewer: Viewer = visitor,
) =>
  (await searchPort.search(inCity(raw), context(viewer))).hits
    .map((hit) => hit.slug)
    .sort();

beforeAll(async () => {
  // Reste abgebrochener Läufe: fiktive Konten dieses Tests und ihre Regionen, sonst stören sie «In meiner Nähe».
  await db.user.deleteMany({
    where: {
      id: { startsWith: "it_suche_" },
      NOT: { id: { endsWith: `_${run}` } },
    },
  });
  await db.category.deleteMany({
    where: {
      slug: { startsWith: "fiktivkategorie-" },
      providers: { none: {} },
    },
  });
  await db.region.deleteMany({
    where: {
      OR: ["fiktivstadt-", "fiktivnah-", "fiktivfern-", "fiktivseiten-"].map(
        (prefix) => ({ slug: { startsWith: prefix } }),
      ),
      providers: { none: {} },
    },
  });
  const canton = await db.region.findUniqueOrThrow({
    where: { slug: "zuerich" },
  });
  for (const [slug, latitude, longitude] of [
    [city, 47.0, 8.0],
    [nearCity, 47.05, 8.05],
    [farCity, 46.0, 6.5],
  ] as const) {
    const region = await db.region.create({
      data: {
        slug,
        kind: "CITY",
        parentId: canton.id,
        nameDe: `Fiktivort ${slug}`,
        nameFr: slug,
        nameIt: slug,
        nameEn: slug,
        approved: true,
        latitude,
        longitude,
      },
    });
    regionIds.push(region.id);
  }
  categoryId = (
    await db.category.create({
      data: {
        slug: category,
        nameDe: "Fiktivkategorie",
        nameFr: "Fictif",
        nameIt: "Fittizio",
        nameEn: "Fictional",
        approved: true,
      },
    })
  ).id;
  await db.user.create({
    data: {
      id: member.kind === "account" ? member.userId : "",
      name: "Fiktiv",
      email: `it_suche_mitglied_${run}@fiktiv.test`,
      emailVerified: true,
    },
  });
  users.push(`it_suche_mitglied_${run}`);
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.providerProfile.deleteMany({ where: { userId: { in: users } } });
  await db.category.deleteMany({ where: { id: categoryId } });
  await db.region.deleteMany({ where: { id: { in: regionIds } } });
});

describe("Suchbar ist genau, was öffentlich zulässig ist (20.3)", () => {
  it("jeder Profilstatus, jede Identität, jeder Prüfentscheid: nur veröffentlicht, gültig und freigegeben erscheint", async () => {
    const statuses: ProviderStatus[] = [
      "DRAFT",
      "SUBMITTED",
      "CHANGES_REQUESTED",
      "PUBLISHED",
      "PAUSED",
      "RESTRICTED",
      "SUSPENDED",
      "ARCHIVED",
    ];
    const expected: string[] = [];
    for (const status of statuses) {
      for (const identity of ["valid", "expired", "none"] as const) {
        for (const review of [
          "APPROVED",
          "REJECTED",
          "open",
          "none",
        ] as const) {
          const { slug } = await provider(
            `m-${status}-${identity}-${review}`.toLowerCase().replace(/_/g, ""),
            { status, identity, review },
          );
          if (
            status === "PUBLISHED" &&
            identity === "valid" &&
            review === "APPROVED"
          )
            expected.push(slug);
        }
      }
    }
    expect(expected).toHaveLength(1);
    expect(await slugs()).toEqual(expected);
    expect(await searchPort.count(inCity(), context(member))).toBe(1);
  }, 60_000);

  it("pausiert, gesperrt oder eingeschränkt verschwindet sofort, auch bevor der Index nachgezogen ist", async () => {
    const { id, slug } = await provider("spaeter-pausiert");
    expect(await slugs()).toContain(slug);
    for (const status of [
      "PAUSED",
      "SUSPENDED",
      "RESTRICTED",
      "ARCHIVED",
    ] as const) {
      await db.providerProfile.update({ where: { id }, data: { status } });
      expect(await slugs()).not.toContain(slug);
    }
    await reindexProfile(id);
    expect(
      await db.searchProfile.count({ where: { providerProfileId: id } }),
    ).toBe(0);
  });

  it("«nur für Mitglieder» erscheint nur angemeldet", async () => {
    const { slug } = await provider("mitglieder", { visibility: "MEMBERS" });
    expect(await slugs()).not.toContain(slug);
    expect(await slugs({}, member)).toContain(slug);
  });

  it("läuft die Identität ab, verschwindet das Profil ohne neuen Index; der nächtliche Neuaufbau räumt die Zeile weg", async () => {
    const { id, slug } = await provider("ablauf");
    const later = new Date(Date.now() + 301 * 86_400_000);
    expect(await slugs()).toContain(slug);
    expect(
      (
        await searchPort.search(inCity(), { ...context(), now: later })
      ).hits.map((hit) => hit.slug),
    ).not.toContain(slug);
    await rebuildSearchIndex(later);
    expect(
      await db.searchProfile.count({ where: { providerProfileId: id } }),
    ).toBe(0);
    // Der Neuaufbau in der Zukunft hat alle Zeilen entfernt; mit der echten Zeit wieder aufbauen.
    await rebuildSearchIndex();
  });

  it("deaktivierte Konten kommen nicht in den Index", async () => {
    const { id } = await provider("deaktiviert");
    await db.user.update({
      where: { id: `it_suche_deaktiviert_${run}` },
      data: { deactivatedAt: new Date() },
    });
    expect(await reindexProfile(id)).toBe("removed");
  });
});

describe("Filterkombinationen liefern korrekte Resultate (20.3)", () => {
  const made: Record<string, string> = {};
  beforeAll(async () => {
    made.billig = (
      await provider("f-billig", {
        price: 150,
        languages: ["de", "en"],
        withCategory: true,
        photo: true,
        publishedDaysAgo: 3,
        name: "Fiktiv Aurelia",
      })
    ).slug;
    made.teuer = (
      await provider("f-teuer", {
        price: 600,
        languages: ["fr"],
        withCategory: true,
        publishedDaysAgo: 90,
      })
    ).slug;
    made.ohnePreis = (
      await provider("f-ohnepreis", {
        price: null,
        languages: ["it"],
        photo: true,
        publishedDaysAgo: 10,
      })
    ).slug;
    made.nah = (await provider("f-nah", { region: nearCity, price: 200 })).slug;
    made.fern = (
      await provider("f-fern", { region: farCity, price: 200 })
    ).slug;
  });

  it("Region ohne Umkreis: nur Profile genau dieser Region", async () => {
    const result = await slugs();
    expect(result).toEqual(
      expect.arrayContaining([made.billig, made.teuer, made.ohnePreis]),
    );
    expect(result).not.toContain(made.nah);
  });

  it("Umkreis um den Ortsmittelpunkt", async () => {
    const result = await slugs({ umkreis: "10" });
    expect(result).toContain(made.nah);
    expect(result).not.toContain(made.fern);
  });

  it("Kanton findet die Profile seiner Städte", async () => {
    const result = (
      await searchPort.search(
        parseSearchQuery({ ort: "zuerich", kategorie: category }),
        context(),
      )
    ).hits.map((hit) => hit.slug);
    expect(result.sort()).toEqual([made.billig, made.teuer].sort());
  });

  it("Sprache (eine von mehreren), Kategorie, Preisrahmen, Fotos, neu und kombiniert", async () => {
    expect(await slugs({ sprache: ["en", "it"] })).toEqual(
      [made.billig, made.ohnePreis].sort(),
    );
    expect(await slugs({ kategorie: category })).toEqual(
      [made.billig, made.teuer].sort(),
    );
    expect(await slugs({ preis_max: "300" })).toEqual(
      expect.arrayContaining([made.billig]),
    );
    expect(await slugs({ preis_max: "300" })).not.toContain(made.ohnePreis);
    expect(await slugs({ preis_min: "500" })).toEqual([made.teuer]);
    expect(await slugs({ fotos: "1" })).toEqual(
      [made.billig, made.ohnePreis].sort(),
    );
    expect(await slugs({ neu: "1" })).toEqual(
      [made.billig, made.ohnePreis].sort(),
    );
    expect(
      await slugs({
        kategorie: category,
        fotos: "1",
        sprache: "en",
        preis_max: "200",
      }),
    ).toEqual([made.billig]);
  });

  it("Freitext: Präfix, Tippfehler im Namen, Region und Kategorie", async () => {
    expect(await slugs({ q: "aure" })).toEqual([made.billig]);
    expect(await slugs({ q: "Aurilia" })).toEqual([made.billig]);
    expect(await slugs({ q: "fiktivkategorie" })).toEqual(
      [made.billig, made.teuer].sort(),
    );
  });

  it("unbekannte Region oder Kategorie ergibt keine Treffer statt aller", async () => {
    expect(
      (
        await searchPort.search(
          parseSearchQuery({ ort: "gibt-es-nicht" }),
          context(),
        )
      ).total,
    ).toBe(0);
    expect(await slugs({ kategorie: "gibt-es-nicht" })).toEqual([]);
  });

  it("keine Treffer: nennt den Filter, der am stärksten einschränkt", async () => {
    const result = await searchPort.search(
      inCity({ sprache: "fr", fotos: "1" }),
      context(),
    );
    expect(result.total).toBe(0);
    // Ohne Sprache: zwei Profile mit Fotos; ohne Fotos: eines auf Französisch.
    expect(result.mostRestrictive).toEqual({ key: "languages", total: 2 });
  });
});

describe("Pagination und Sortierung (20.3)", () => {
  const region = `fiktivseiten-${run}`;
  beforeAll(async () => {
    const canton = await db.region.findUniqueOrThrow({
      where: { slug: "bern" },
    });
    regionIds.push(
      (
        await db.region.create({
          data: {
            slug: region,
            kind: "CITY",
            parentId: canton.id,
            nameDe: "Fiktivseiten",
            nameFr: region,
            nameIt: region,
            nameEn: region,
            approved: true,
          },
        })
      ).id,
    );
    for (let index = 0; index < PAGE_SIZE + 6; index += 1) {
      await provider(`p${index}`, {
        region,
        price: 100 + index * 10,
        publishedDaysAgo: 1 + index,
      });
    }
  }, 60_000);

  it("Seite 1 lädt 24, «Weitere laden» die nächsten, ohne Dubletten", async () => {
    const first = await searchPort.search(
      parseSearchQuery({ ort: region }),
      context(),
    );
    expect(first.total).toBe(PAGE_SIZE + 6);
    expect(first.hits).toHaveLength(PAGE_SIZE);
    expect(first.hasMore).toBe(true);
    const second = await searchPort.search(
      parseSearchQuery({ ort: region, seite: "2" }),
      context(),
    );
    expect(second.hits).toHaveLength(PAGE_SIZE + 6);
    expect(second.hasMore).toBe(false);
    expect(new Set(second.hits.map((hit) => hit.slug)).size).toBe(
      PAGE_SIZE + 6,
    );
    expect(second.hits.slice(0, PAGE_SIZE).map((hit) => hit.slug)).toEqual(
      first.hits.map((hit) => hit.slug),
    );
  });

  it("Preis aufsteigend, neu zuerst, kürzlich aktualisiert", async () => {
    const byPrice = (
      await searchPort.search(
        parseSearchQuery({ ort: region, sortierung: "preis" }),
        context(),
      )
    ).hits.map((hit) => hit.priceFromChf);
    expect(byPrice).toEqual([...byPrice].sort((a, b) => (a ?? 0) - (b ?? 0)));
    const newest = (
      await searchPort.search(
        parseSearchQuery({ ort: region, sortierung: "neu" }),
        context(),
      )
    ).hits[0];
    expect(newest?.slug).toBe(`fiktiv-suche-p0-${run}`);
    const latest = await db.providerProfile.update({
      where: { slug: `fiktiv-suche-p20-${run}` },
      data: { contentUpdatedAt: new Date() },
      select: { id: true },
    });
    await reindexProfile(latest.id);
    expect(
      (
        await searchPort.search(
          parseSearchQuery({ ort: region, sortierung: "aktualisiert" }),
          context(),
        )
      ).hits[0]?.slug,
    ).toBe(`fiktiv-suche-p20-${run}`);
  });
});

describe("Vorschläge", () => {
  it("Regionen, Kategorien und Namen suchbarer Profile; nie nicht öffentliche", async () => {
    await provider("v-sichtbar", { name: `Fiktiv Zephyrine ${run}` });
    await provider("v-entwurf", {
      name: `Fiktiv Zephyrina ${run}`,
      status: "DRAFT",
    });
    const suggestions = await searchPort.suggest("Zephyrin", context());
    const names = suggestions
      .filter((entry) => entry.kind === "profile")
      .map((entry) => entry.name);
    expect(names).toContain(`Fiktiv Zephyrine ${run}`);
    expect(names).not.toContain(`Fiktiv Zephyrina ${run}`);
    expect(
      (await searchPort.suggest("Fiktivkateg", context())).some(
        (entry) => entry.kind === "category" && entry.slug === category,
      ),
    ).toBe(true);
    expect(await searchPort.suggest("z", context())).toEqual([]);
  });
});

describe("In meiner Nähe", () => {
  it("findet die nächste freigegebene Region; Stadt vor Kanton mit gleichem Mittelpunkt; ungültige Koordinaten ergeben nichts", async () => {
    expect((await nearestRegion(47.3769, 8.5417))?.slug).toBe("stadt-zuerich");
    expect((await nearestRegion(47.0001, 8.0001))?.slug).toBe(city);
    // Die Grenze von 150 km prüft die Aktion «In meiner Nähe»; hier zählt die Entfernung.
    expect((await nearestRegion(52.52, 13.405))?.distanceKm).toBeGreaterThan(
      150,
    );
    expect(await nearestRegion(Number.NaN, 8)).toBeNull();
    expect(await nearestRegion(95, 8)).toBeNull();
  });
});

void EMPTY_QUERY;
