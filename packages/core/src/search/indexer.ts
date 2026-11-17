import { getDb } from "@app/db";
import { isPubliclyVisible } from "../verification/policy";
import { completeness } from "./completeness";

/**
 * Baut die Zeile in `search_profile` für ein Profil (PRD v2 14.4). Nur
 * öffentlich sichtbare Profile kommen in den Index, und nur mit öffentlichen,
 * freigegebenen Daten: freigegebene Regionen und Kategorien, sichtbare Preise,
 * öffentlich freigegebene Bilder. Alles andere entfernt die Zeile.
 *
 * Die Suche prüft Status und Ablauf der Identität zusätzlich bei jeder Abfrage.
 * Eine verspätete Aktualisierung kann ein Profil deshalb höchstens zu spät
 * zeigen, nie zu lange.
 */
async function loadForIndex(providerProfileId: string) {
  const db = getDb();
  const profile = await db.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: {
      id: true,
      userId: true,
      slug: true,
      displayName: true,
      status: true,
      visibility: true,
      shortDescription: true,
      description: true,
      languages: true,
      locationLabel: true,
      publishedAt: true,
      contentUpdatedAt: true,
      createdAt: true,
      user: { select: { deactivatedAt: true, deletionRequestedAt: true } },
      regions: {
        where: { region: { approved: true } },
        select: {
          region: {
            select: {
              id: true,
              kind: true,
              nameDe: true,
              nameFr: true,
              nameIt: true,
              nameEn: true,
              parent: {
                select: {
                  id: true,
                  approved: true,
                  nameDe: true,
                  nameFr: true,
                  nameIt: true,
                  nameEn: true,
                },
              },
            },
          },
        },
      },
      services: {
        where: { category: { approved: true } },
        select: {
          category: {
            select: {
              id: true,
              nameDe: true,
              nameFr: true,
              nameIt: true,
              nameEn: true,
            },
          },
        },
      },
      rates: { where: { hidden: false }, select: { priceChf: true } },
      reviews: {
        where: { kind: "PROFILE" },
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: { decision: true },
      },
      media: {
        where: {
          status: "PUBLISHED",
          visibility: "PUBLIC",
          deletedAt: null,
          width: { not: null },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, isCover: true, dominantColor: true, altText: true },
      },
    },
  });
  if (!profile) return null;
  const identity = await db.identityCheck.findFirst({
    where: { userId: profile.userId },
    orderBy: { createdAt: "desc" },
    select: {
      status: true,
      ageOver18: true,
      livenessPassed: true,
      expiresAt: true,
    },
  });
  return { profile, identity };
}

type Names = { nameDe: string; nameFr: string; nameIt: string; nameEn: string };
const allNames = (names: Names) => [
  names.nameDe,
  names.nameFr,
  names.nameIt,
  names.nameEn,
];

export type IndexOutcome = "indexed" | "removed";

export async function reindexProfile(
  providerProfileId: string,
  now = new Date(),
): Promise<IndexOutcome> {
  const db = getDb();
  const loaded = await loadForIndex(providerProfileId);
  const remove = async (): Promise<IndexOutcome> => {
    await db.searchProfile.deleteMany({ where: { providerProfileId } });
    return "removed";
  };
  if (!loaded) return remove();
  const { profile, identity } = loaded;
  const visible = isPubliclyVisible(
    {
      profileStatus: profile.status,
      identity,
      latestReview: profile.reviews[0]?.decision ?? null,
    },
    now,
  );
  if (
    !visible ||
    !identity?.expiresAt ||
    profile.user.deactivatedAt ||
    profile.user.deletionRequestedAt
  )
    return remove();

  const regions = profile.regions.map((entry) => entry.region);
  const regionIds = new Set<string>();
  const terms = new Set<string>();
  for (const region of regions) {
    regionIds.add(region.id);
    allNames(region).forEach((name) => terms.add(name));
    if (region.parent?.approved) {
      regionIds.add(region.parent.id);
      allNames(region.parent).forEach((name) => terms.add(name));
    }
  }
  const categories = profile.services.map((entry) => entry.category);
  categories.forEach((category) =>
    allNames(category).forEach((name) => terms.add(name)),
  );
  if (profile.locationLabel) terms.add(profile.locationLabel);

  const primary = [...regions].sort((a, b) =>
    a.kind === b.kind
      ? a.nameDe.localeCompare(b.nameDe, "de")
      : a.kind === "CITY"
        ? -1
        : 1,
  )[0];
  const cover =
    profile.media.find((media) => media.isCover) ?? profile.media[0];
  const prices = profile.rates.map((rate) => rate.priceChf);
  const reviewCount = await db.review.count({
    where: { providerProfileId, status: "PUBLISHED" },
  });
  const publishedAt = profile.publishedAt ?? profile.createdAt;
  const data = {
    slug: profile.slug,
    displayName: profile.displayName,
    audience: profile.visibility,
    identityValidUntil: identity.expiresAt,
    shortDescription: profile.shortDescription,
    languages: profile.languages,
    regionIds: [...regionIds].sort(),
    primaryRegionId: primary?.id ?? null,
    locationLabel: profile.locationLabel,
    categoryIds: categories.map((category) => category.id).sort(),
    priceFromChf: prices.length > 0 ? Math.min(...prices) : null,
    hasPhotos: profile.media.length > 0,
    reviewCount,
    coverMediaId: cover?.id ?? null,
    coverColor: cover?.dominantColor ?? null,
    coverAlt: cover?.altText ?? null,
    completeness: completeness({
      hasShortDescription: Boolean(profile.shortDescription),
      descriptionLength: profile.description?.length ?? 0,
      languageCount: profile.languages.length,
      serviceCount: categories.length,
      rateCount: prices.length,
      photoCount: profile.media.length,
    }),
    searchTerms: [...terms].join(" "),
    publishedAt,
    contentUpdatedAt: profile.contentUpdatedAt ?? publishedAt,
    indexedAt: now,
  };
  await db.searchProfile.upsert({
    where: { providerProfileId },
    create: { providerProfileId, ...data },
    update: data,
  });
  return "indexed";
}

/**
 * Baut den ganzen Index neu auf (nächtlich im Cron-Dienst): indexiert alle
 * Kandidaten und entfernt Zeilen, deren Profil nicht mehr öffentlich ist.
 */
export async function rebuildSearchIndex(
  now = new Date(),
): Promise<{ indexed: number; removed: number }> {
  const db = getDb();
  const candidates = await db.providerProfile.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true },
  });
  const stale = await db.searchProfile.findMany({
    where: { providerProfileId: { notIn: candidates.map((row) => row.id) } },
    select: { providerProfileId: true },
  });
  let indexed = 0;
  let removed = 0;
  for (const { id } of candidates) {
    if ((await reindexProfile(id, now)) === "indexed") indexed += 1;
    else removed += 1;
  }
  for (const { providerProfileId } of stale) {
    await reindexProfile(providerProfileId, now);
    removed += 1;
  }
  return { indexed, removed };
}
