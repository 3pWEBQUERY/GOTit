import type { SearchQuery } from "@app/core/search";

export type DescribeKey =
  | "text"
  | "region"
  | "regionRadius"
  | "regionUnknown"
  | "languages"
  | "categories"
  | "categoryUnknown"
  | "priceBetween"
  | "priceMin"
  | "priceMax"
  | "photos"
  | "newOnly"
  | "none";

export interface DescribeContext {
  /** Übersetzt einen Schlüssel aus `favorites.searches.describe`. */
  t: (key: DescribeKey, values?: Record<string, string | number>) => string;
  /** Name einer freigegebenen Region oder null, wenn sie nicht mehr freigegeben ist. */
  regionName: (slug: string) => string | null;
  categoryName: (slug: string) => string | null;
  languageName: (code: string) => string;
  /** «Deutsch oder Englisch»: innerhalb einer Gruppe gilt «oder» (Entscheid 0013). */
  orList: (items: string[]) => string;
  chf: (amount: number) => string;
}

/**
 * Beschreibt die Filter einer gespeicherten Suche in Worten, in der
 * Reihenfolge der Filtergruppen. Nicht mehr freigegebene Regionen und
 * Kategorien werden benannt statt still verschluckt.
 */
export function describeSearch(
  query: SearchQuery,
  context: DescribeContext,
): string[] {
  const { t } = context;
  const parts: string[] = [];
  if (query.q) parts.push(t("text", { q: query.q }));
  if (query.region) {
    const region = context.regionName(query.region);
    if (!region) parts.push(t("regionUnknown"));
    else
      parts.push(
        query.radiusKm
          ? t("regionRadius", { region, km: query.radiusKm })
          : t("region", { region }),
      );
  }
  if (query.languages.length > 0)
    parts.push(
      t("languages", {
        languages: context.orList(query.languages.map(context.languageName)),
      }),
    );
  if (query.categories.length > 0) {
    const names = query.categories.map(context.categoryName);
    const known = names.filter((name): name is string => name !== null);
    if (known.length > 0)
      parts.push(t("categories", { categories: context.orList(known) }));
    if (known.length < names.length) parts.push(t("categoryUnknown"));
  }
  if (query.priceMin !== null && query.priceMax !== null)
    parts.push(
      t("priceBetween", {
        min: context.chf(query.priceMin),
        max: context.chf(query.priceMax),
      }),
    );
  else if (query.priceMin !== null)
    parts.push(t("priceMin", { min: context.chf(query.priceMin) }));
  else if (query.priceMax !== null)
    parts.push(t("priceMax", { max: context.chf(query.priceMax) }));
  if (query.photos) parts.push(t("photos"));
  if (query.newOnly) parts.push(t("newOnly"));
  return parts.length > 0 ? parts : [t("none")];
}
