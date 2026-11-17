import { listApprovedCategories } from "@app/core/catalog";
import type { Locale } from "@app/core/locale";
import {
  listRegionLanding,
  listSavedSearches,
  MAX_SAVED_SEARCHES,
  toSearchParams,
} from "@app/core/search";
import { getTranslations } from "next-intl/server";
import { formatChf, languageName } from "../../onboarding/format";
import { createHref } from "../../shell/nav/href";
import { describeSearch, type DescribeKey } from "../lib/describe-search";

export interface SavedSearchItem {
  id: string;
  name: string;
  /** Die Suche mit genau diesen Filtern, auf `/suche`. */
  href: string;
  /** Die Filter in Worten, zum Beispiel «Zürich · spricht Deutsch oder Englisch». */
  description: string;
  savedAt: string;
}

/** Gespeicherte Suchen eines Kontos mit Beschreibung in Worten (PRD v2 7.5 `/suchen`). */
export async function loadSavedSearches(
  userId: string,
  locale: Locale,
): Promise<{ items: SavedSearchItem[]; max: number }> {
  const searches = await listSavedSearches(userId);
  if (searches.length === 0) return { items: [], max: MAX_SAVED_SEARCHES };
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
  const date = new Intl.DateTimeFormat(`${locale}-CH`, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Zurich",
  });
  const href = createHref(locale);
  const context = {
    t: (key: DescribeKey, values?: Record<string, string | number>) =>
      t(key, values),
    regionName: (slug: string) => regions.get(slug) ?? null,
    categoryName: (slug: string) => categoryNames.get(slug) ?? null,
    languageName: (code: string) => languageName(locale, code),
    orList: (items: string[]) => orList.format(items),
    chf: (amount: number) => formatChf(locale, amount),
  };
  return {
    max: MAX_SAVED_SEARCHES,
    items: searches.map((search) => ({
      id: search.id,
      name: search.name,
      href: href({ pathname: "/suche", query: toSearchParams(search.query) }),
      description: describeSearch(search.query, context).join(" · "),
      savedAt: date.format(search.createdAt),
    })),
  };
}
