import {
  EMPTY_QUERY,
  parseSearchQuery,
  queryKey,
  toSearchParams,
  type RawParams,
  type SearchQuery,
} from "@app/core/search/query";

/**
 * Voreinstellung einer Landingpage (Entscheid 0013): `/ch/[kanton]` und
 * `/ch/[kanton]/[stadt]` legen die Region fest, `/kategorie/[slug]` die
 * Kategorie, `/profile` nichts. Zusätzliche Filter bleiben auf dem Pfad der
 * Landingpage; wer die Voreinstellung ändert, landet auf `/suche`.
 */
export interface SearchPreset {
  /** Fertiger, übersetzter Pfad der Landingpage ohne Parameter. */
  path: string;
  region?: string;
  category?: string;
}

export interface SearchPaths {
  /** Übersetzter Pfad von `/suche`. */
  search: string;
  preset: SearchPreset | null;
}

/** Liest die Parameter einer Seite; die Voreinstellung überschreibt `ort` und `kategorie` aus der URL. */
export function presetQuery(
  raw: RawParams,
  preset: SearchPreset | null,
): SearchQuery {
  if (!preset) return parseSearchQuery(raw);
  return parseSearchQuery({
    ...raw,
    ...(preset.region ? { ort: preset.region } : {}),
    ...(preset.category ? { kategorie: preset.category } : {}),
  });
}

/** Bleibt die Voreinstellung in dieser Suche erhalten? */
export function keepsPreset(query: SearchQuery, preset: SearchPreset): boolean {
  if (preset.region && query.region !== preset.region) return false;
  if (
    preset.category &&
    (query.categories.length !== 1 || query.categories[0] !== preset.category)
  )
    return false;
  return true;
}

/** Parameter als Query-String; Listen mit Komma, wie `parseSearchQuery` sie liest. */
export function toQueryString(
  params: Record<string, string | string[]>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    search.set(key, Array.isArray(value) ? value.join(",") : value);
  const text = search.toString().replace(/%2C/g, ",");
  return text ? `?${text}` : "";
}

/** URL einer Suche: auf der Landingpage, solange die Voreinstellung gilt, sonst auf `/suche`. */
export function searchUrl(paths: SearchPaths, query: SearchQuery): string {
  const params = toSearchParams(query);
  const { preset } = paths;
  if (!preset || !keepsPreset(query, preset))
    return `${paths.search}${toQueryString(params)}`;
  if (preset.region) delete params.ort;
  if (preset.category) delete params.kategorie;
  return `${preset.path}${toQueryString(params)}`;
}

/** Ausgangszustand der Seite: ohne Filter, mit der Voreinstellung; Sortierung und Ansicht bleiben. */
export function resetQuery(
  query: SearchQuery,
  preset: SearchPreset | null,
): SearchQuery {
  return {
    ...EMPTY_QUERY,
    sort: query.sort,
    view: query.view,
    region: preset?.region ?? null,
    categories: preset?.category ? [preset.category] : [],
  };
}

/** Sind Filter über die Voreinstellung hinaus gesetzt? */
export function hasOwnFilters(
  query: SearchQuery,
  preset: SearchPreset | null,
): boolean {
  return queryKey(query) !== queryKey(resetQuery(query, preset));
}

/** Ein Filter wurde geändert: die Seite springt auf 1. */
export function withFilters(
  query: SearchQuery,
  change: Partial<SearchQuery>,
): SearchQuery {
  const next = { ...query, ...change, page: 1 };
  if (!next.region) next.radiusKm = null;
  return next;
}
