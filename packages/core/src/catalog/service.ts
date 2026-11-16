import { getDb } from "@app/db";
import { pickLocalizedName, type Locale } from "../locale";

export interface CategorySummary {
  slug: string;
  name: string;
}

/** Freigegebene Kategorien in gepflegter Reihenfolge; das Mega-Menü zeigt höchstens 8 (PRD 6.3). */
export async function listApprovedCategories(locale: Locale, limit = 8): Promise<CategorySummary[]> {
  const rows = await getDb().category.findMany({
    where: { approved: true },
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    take: limit,
  });
  return rows.map((row) => ({ slug: row.slug, name: pickLocalizedName(row, locale) }));
}
