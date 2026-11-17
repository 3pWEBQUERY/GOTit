import { listApprovedCategories } from "@app/core/catalog";
import type { Locale } from "@app/core/locale";
import { listRegionLanding } from "@app/core/search";
import { getTranslations } from "next-intl/server";
import { formatChf, languageName } from "../../onboarding/format";
import type { DescribeContext, DescribeKey } from "./describe-search";

/**
 * Wörter für `describeSearch` in einer Sprache: Namen freigegebener Regionen
 * und Kategorien, Sprachen und Beträge. Gespeicherte Suchen und die Statistik
 * («Suchen, in denen du erschienst») beschreiben Filter so gleich.
 */
export async function loadDescribeContext(
  locale: Locale,
): Promise<DescribeContext> {
  const [cantons, categories, t] = await Promise.all([
    listRegionLanding(locale),
    listApprovedCategories(locale, 500),
    getTranslations({ locale, namespace: "favorites.searches.describe" }),
  ]);
  const regions = new Map<string, string>();
  for (const canton of cantons) {
    regions.set(canton.slug, canton.name);
    for (const city of canton.cities) regions.set(city.slug, city.name);
  }
  const categoryNames = new Map(
    categories.map((category) => [category.slug, category.name]),
  );
  const orList = new Intl.ListFormat(locale, { type: "disjunction" });
  return {
    t: (key: DescribeKey, values?: Record<string, string | number>) =>
      t(key, values),
    regionName: (slug: string) => regions.get(slug) ?? null,
    categoryName: (slug: string) => categoryNames.get(slug) ?? null,
    languageName: (code: string) => languageName(locale, code),
    orList: (items: string[]) => orList.format(items),
    chf: (amount: number) => formatChf(locale, amount),
  };
}
