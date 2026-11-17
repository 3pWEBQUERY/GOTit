import { getDb, Prisma } from "@app/db";
import { pickLocalizedName } from "../locale";
import { QUERY_MAX } from "./query";
import type { SearchContext, Suggestion } from "./types";

const PER_KIND = 4;
export const SUGGEST_MIN_LENGTH = 2;

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Suchvorschläge (PRD v1 FR-SEARCH-005): freigegebene Regionen, freigegebene
 * Kategorien und Namen suchbarer Profile. Profile nur unter denselben Regeln
 * wie die Suche; für Besucher keine Profile «nur für Mitglieder».
 */
export async function suggest(
  text: string,
  context: SearchContext,
): Promise<Suggestion[]> {
  const term = text.replace(/\s+/g, " ").trim().slice(0, QUERY_MAX);
  if (term.length < SUGGEST_MIN_LENGTH) return [];
  const db = getDb();
  const contains = { contains: term, mode: "insensitive" as const };
  const names = [
    { nameDe: contains },
    { nameFr: contains },
    { nameIt: contains },
    { nameEn: contains },
  ];
  const now = context.now ?? new Date();
  const audience =
    context.viewer.kind === "account"
      ? Prisma.empty
      : Prisma.sql`AND sp.audience = 'PUBLIC'`;
  const contained = `%${escapeLike(term)}%`;

  const [regions, categories, profiles] = await Promise.all([
    db.region.findMany({
      where: { approved: true, OR: names },
      orderBy: [
        { featuredRank: { sort: "asc", nulls: "last" } },
        { kind: "desc" },
        { nameDe: "asc" },
      ],
      take: PER_KIND,
      select: {
        slug: true,
        nameDe: true,
        nameFr: true,
        nameIt: true,
        nameEn: true,
        parent: { select: { slug: true } },
      },
    }),
    db.category.findMany({
      where: { approved: true, OR: names },
      orderBy: { sortOrder: "asc" },
      take: PER_KIND,
      select: {
        slug: true,
        nameDe: true,
        nameFr: true,
        nameIt: true,
        nameEn: true,
      },
    }),
    db.$queryRaw<{ slug: string; displayName: string }[]>`
      SELECT sp.slug, sp."displayName"
      FROM search_profile sp JOIN provider_profile pp ON pp.id = sp."providerProfileId"
      WHERE pp.status = 'PUBLISHED' AND sp."identityValidUntil" > ${now} ${audience}
        AND (sp."displayName" ILIKE ${contained} OR word_similarity(${term}, sp."displayName") > 0.4)
      ORDER BY word_similarity(${term}, sp."displayName") DESC, sp."providerProfileId" ASC
      LIMIT ${PER_KIND}`,
  ]);
  return [
    ...regions.map(
      (region): Suggestion => ({
        kind: "region",
        slug: region.slug,
        name: pickLocalizedName(region, context.locale),
        cantonSlug: region.parent?.slug ?? null,
      }),
    ),
    ...categories.map(
      (category): Suggestion => ({
        kind: "category",
        slug: category.slug,
        name: pickLocalizedName(category, context.locale),
      }),
    ),
    ...profiles.map(
      (profile): Suggestion => ({
        kind: "profile",
        slug: profile.slug,
        name: profile.displayName,
      }),
    ),
  ];
}
