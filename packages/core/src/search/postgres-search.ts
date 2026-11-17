import { getDb, Prisma } from "@app/db";
import { pickLocalizedName } from "../locale";
import {
  MAX_PAGE,
  NEW_PROFILE_DAYS,
  PAGE_SIZE,
  activeFilters,
  withoutFilter,
  type FilterKey,
  type SearchQuery,
} from "./query";
import { resolveRegionFilter } from "./region-filter";
import { suggest } from "./suggest";
import type {
  SearchContext,
  SearchHit,
  SearchPort,
  SearchResult,
} from "./types";

const DAY_MS = 24 * 3600 * 1000;
/** Ab dieser Wortähnlichkeit (pg_trgm) zählt ein Name als Treffer trotz Tippfehler. */
const NAME_SIMILARITY = 0.4;

interface Row {
  slug: string;
  displayName: string;
  primaryRegionId: string | null;
  locationLabel: string | null;
  shortDescription: string | null;
  languages: string[];
  priceFromChf: number | null;
  hasPhotos: boolean;
  coverMediaId: string | null;
  coverColor: string | null;
  coverAlt: string | null;
}

/** Freitext als Präfixsuche: jedes Wort muss vorkommen («zür» findet «Zürich»). */
export function toPrefixTsQuery(text: string): string | null {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const unique = [...new Set(words)].slice(0, 8);
  return unique.length > 0
    ? unique.map((word) => `${word}:*`).join(" & ")
    : null;
}

type Compiled =
  | { where: Prisma.Sql; tsQuery: string | null; regionId: string | null }
  | { empty: true };

/**
 * Übersetzt die Suchparameter in eine WHERE-Klausel. Immer enthalten sind die
 * Regeln, die ein Profil überhaupt suchbar machen, zur Abfragezeit geprüft:
 * Profil veröffentlicht, Identitätsprüfung gültig, «nur für Mitglieder» nur
 * für angemeldete Konten. Pausierte, gesperrte und eingeschränkte Profile
 * erscheinen so in keinem Suchpfad, auch wenn der Index noch nicht nachgezogen ist.
 */
async function compile(
  query: SearchQuery,
  context: SearchContext,
): Promise<Compiled> {
  const now = context.now ?? new Date();
  const parts: Prisma.Sql[] = [
    Prisma.sql`pp.status = 'PUBLISHED'`,
    Prisma.sql`sp."identityValidUntil" > ${now}`,
  ];
  if (context.viewer.kind !== "account")
    parts.push(Prisma.sql`sp.audience = 'PUBLIC'`);

  let regionId: string | null = null;
  if (query.region) {
    const region = await resolveRegionFilter(query.region, query.radiusKm);
    if (!region) return { empty: true };
    regionId = region.regionId;
    parts.push(
      query.radiusKm
        ? Prisma.sql`sp."regionIds" && ${region.ids}::text[]`
        : Prisma.sql`sp."regionIds" @> ${region.ids}::text[]`,
    );
  }
  if (query.categories.length > 0) {
    const categories = await getDb().category.findMany({
      where: { slug: { in: query.categories }, approved: true },
      select: { id: true },
    });
    if (categories.length === 0) return { empty: true };
    parts.push(
      Prisma.sql`sp."categoryIds" && ${categories.map((category) => category.id)}::text[]`,
    );
  }
  if (query.languages.length > 0)
    parts.push(Prisma.sql`sp.languages && ${query.languages}::text[]`);
  if (query.priceMin !== null)
    parts.push(Prisma.sql`sp."priceFromChf" >= ${query.priceMin}`);
  if (query.priceMax !== null)
    parts.push(Prisma.sql`sp."priceFromChf" <= ${query.priceMax}`);
  if (query.photos) parts.push(Prisma.sql`sp."hasPhotos" = true`);
  if (query.newOnly)
    parts.push(
      Prisma.sql`sp."publishedAt" > ${new Date(now.getTime() - NEW_PROFILE_DAYS * DAY_MS)}`,
    );

  const tsQuery = query.q ? toPrefixTsQuery(query.q) : null;
  if (query.q) {
    const text = query.q;
    parts.push(
      tsQuery
        ? Prisma.sql`(sp.search_vector @@ to_tsquery('simple', ${tsQuery}) OR word_similarity(${text}, sp."displayName") > ${NAME_SIMILARITY})`
        : Prisma.sql`word_similarity(${text}, sp."displayName") > ${NAME_SIMILARITY}`,
    );
  }
  return { where: Prisma.join(parts, " AND "), tsQuery, regionId };
}

const FROM = Prisma.sql`search_profile sp JOIN provider_profile pp ON pp.id = sp."providerProfileId"`;

/**
 * Ranking «Relevanz» (PRD v1 FR-SEARCH-004): Textrelevanz, regionale
 * Übereinstimmung, Vollständigkeit und Aktualität. Verifizierung und Tarif
 * fliessen nicht ein. Gleichstand löst die ID auf, damit Seiten stabil bleiben.
 */
function orderBy(
  query: SearchQuery,
  compiled: Exclude<Compiled, { empty: true }>,
  now: Date,
): Prisma.Sql {
  const tie = Prisma.sql`sp."providerProfileId" ASC`;
  switch (query.sort) {
    case "aktualisiert":
      return Prisma.sql`sp."contentUpdatedAt" DESC, ${tie}`;
    case "neu":
      return Prisma.sql`sp."publishedAt" DESC, ${tie}`;
    case "preis":
      return Prisma.sql`sp."priceFromChf" ASC NULLS LAST, ${tie}`;
    case "relevanz": {
      const text = compiled.tsQuery
        ? Prisma.sql`ts_rank(sp.search_vector, to_tsquery('simple', ${compiled.tsQuery})) * 2 + word_similarity(${query.q ?? ""}, sp."displayName")`
        : Prisma.sql`0`;
      const region = compiled.regionId
        ? Prisma.sql`CASE WHEN sp."primaryRegionId" = ${compiled.regionId} THEN 0.2 ELSE 0 END`
        : Prisma.sql`0`;
      // Aktualität: halbiert sich alle 30 Tage seit der letzten Änderung.
      const days = Prisma.sql`GREATEST(EXTRACT(EPOCH FROM (${now}::timestamp - sp."contentUpdatedAt")) / 86400, 0)`;
      return Prisma.sql`(${text}) + (${region}) + sp.completeness / 200.0 + 0.3 * power(0.5, ${days} / 30.0) DESC, ${tie}`;
    }
  }
}

async function countCompiled(compiled: Compiled): Promise<number> {
  if ("empty" in compiled) return 0;
  const [row] = await getDb().$queryRaw<
    { total: bigint }[]
  >`SELECT count(*) AS total FROM ${FROM} WHERE ${compiled.where}`;
  return Number(row?.total ?? 0);
}

async function regionNames(
  ids: string[],
  context: SearchContext,
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await getDb().region.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      nameDe: true,
      nameFr: true,
      nameIt: true,
      nameEn: true,
    },
  });
  return new Map(
    rows.map((row) => [row.id, pickLocalizedName(row, context.locale)]),
  );
}

function toHit(row: Row, names: Map<string, string>): SearchHit {
  return {
    slug: row.slug,
    displayName: row.displayName,
    regionName: row.primaryRegionId
      ? (names.get(row.primaryRegionId) ?? null)
      : null,
    locationLabel: row.locationLabel,
    shortDescription: row.shortDescription,
    languages: row.languages,
    priceFromChf: row.priceFromChf,
    identityChecked: true,
    photosChecked: row.hasPhotos,
    cover: row.coverMediaId
      ? { mediaId: row.coverMediaId, color: row.coverColor, alt: row.coverAlt }
      : null,
  };
}

/** Bei null Treffern: Welcher einzelne Filter schränkt am stärksten ein? */
async function findMostRestrictive(
  query: SearchQuery,
  context: SearchContext,
): Promise<SearchResult["mostRestrictive"]> {
  let best: { key: FilterKey; total: number } | null = null;
  for (const key of activeFilters(query)) {
    const total = await countCompiled(
      await compile(withoutFilter(query, key), context),
    );
    if (total > 0 && (!best || total > best.total)) best = { key, total };
  }
  return best;
}

export const postgresSearch: SearchPort = {
  async search(query, context) {
    const now = context.now ?? new Date();
    const page = Math.min(Math.max(query.page, 1), MAX_PAGE);
    const compiled = await compile(query, context);
    if ("empty" in compiled)
      return {
        hits: [],
        total: 0,
        page,
        hasMore: false,
        mostRestrictive: await findMostRestrictive(query, context),
      };
    const limit = page * PAGE_SIZE;
    const [rows, total] = await Promise.all([
      getDb().$queryRaw<Row[]>`
        SELECT sp.slug, sp."displayName", sp."primaryRegionId", sp."locationLabel", sp."shortDescription", sp.languages,
               sp."priceFromChf", sp."hasPhotos", sp."coverMediaId", sp."coverColor", sp."coverAlt"
        FROM ${FROM} WHERE ${compiled.where}
        ORDER BY ${orderBy(query, compiled, now)}
        LIMIT ${limit}`,
      countCompiled(compiled),
    ]);
    const names = await regionNames(
      [
        ...new Set(
          rows.flatMap((row) =>
            row.primaryRegionId ? [row.primaryRegionId] : [],
          ),
        ),
      ],
      context,
    );
    return {
      hits: rows.map((row) => toHit(row, names)),
      total,
      page,
      hasMore: total > limit && page < MAX_PAGE,
      mostRestrictive:
        total === 0 ? await findMostRestrictive(query, context) : null,
    };
  },
  async count(query, context) {
    return countCompiled(await compile(query, context));
  },
  suggest,
};
