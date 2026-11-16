import { getDb } from "@app/db";
import { pickLocalizedName, type Locale } from "../locale";
import type { RegionSummary } from "./types";

const regionSelect = {
  slug: true,
  kind: true,
  nameDe: true,
  nameFr: true,
  nameIt: true,
  nameEn: true,
  parent: { select: { slug: true } },
} as const;

/** Freigegebene, hervorgehobene Regionen für Mega-Menü und Entdecken-Sheet (PRD 6.3). */
export async function listFeaturedRegions(locale: Locale, limit = 5): Promise<RegionSummary[]> {
  const rows = await getDb().region.findMany({
    where: { approved: true, featuredRank: { not: null } },
    orderBy: { featuredRank: "asc" },
    take: limit,
    select: regionSelect,
  });
  return rows.map((row) => ({
    slug: row.slug,
    kind: row.kind,
    name: pickLocalizedName(row, locale),
    cantonSlug: row.parent?.slug ?? null,
  }));
}
