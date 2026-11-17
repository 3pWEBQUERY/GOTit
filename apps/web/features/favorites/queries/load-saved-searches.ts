import type { Locale } from "@app/core/locale";
import {
  listSavedSearches,
  MAX_SAVED_SEARCHES,
  toSearchParams,
} from "@app/core/search";
import { createHref } from "../../shell/nav/href";
import { loadDescribeContext } from "../lib/describe-context";
import { describeSearch } from "../lib/describe-search";

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
  const context = await loadDescribeContext(locale);
  const date = new Intl.DateTimeFormat(`${locale}-CH`, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Zurich",
  });
  const href = createHref(locale);
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
