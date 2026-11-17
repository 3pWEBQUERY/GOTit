import { z } from "zod";

/**
 * Suchparameter in der URL (PRD v2 9.2, v1 FR-SEARCH-005). Die URL ist teilbar
 * und enthält nie private Daten: nur Freitext, Regions- und Kategorie-Slugs,
 * Sprachcodes, Preisgrenzen und Schalter. Der Umkreis bezieht sich immer auf
 * den Mittelpunkt einer Region, nie auf eine Adresse.
 *
 * Die Schlüssel sind in allen Sprachen gleich, damit eine geteilte URL nach
 * einem Sprachwechsel dieselbe Suche zeigt.
 */
export const SEARCH_SORTS = [
  "relevanz",
  "aktualisiert",
  "neu",
  "preis",
] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const SEARCH_VIEWS = ["raster", "liste"] as const;
export type SearchView = (typeof SEARCH_VIEWS)[number];

/** Umkreis in Kilometern um den Mittelpunkt der gewählten Region. */
export const SEARCH_RADII = [10, 25, 50] as const;
export type SearchRadius = (typeof SEARCH_RADII)[number];

export const PAGE_SIZE = 24;
/** Höchstens so viele Seiten lädt «Weitere laden» (24 × 20 = 480 Profile). */
export const MAX_PAGE = 20;
export const QUERY_MAX = 80;
const SLUG = /^[a-z0-9-]{1,80}$/;
const LANGUAGE = /^[a-z]{2}$/;
const MAX_MULTI = 10;
export const PRICE_LIMIT = 10_000;
/** «Neu dabei»: in den letzten 30 Tagen veröffentlicht. */
export const NEW_PROFILE_DAYS = 30;

export interface SearchQuery {
  q: string | null;
  /** Slug einer freigegebenen Region (Kanton oder Stadt). */
  region: string | null;
  radiusKm: SearchRadius | null;
  languages: string[];
  categories: string[];
  priceMin: number | null;
  priceMax: number | null;
  /** Nur Profile mit mindestens einem geprüften Foto. */
  photos: boolean;
  /** Nur Profile, die in den letzten 30 Tagen veröffentlicht wurden. */
  newOnly: boolean;
  sort: SearchSort;
  view: SearchView;
  page: number;
}

export const EMPTY_QUERY: SearchQuery = {
  q: null,
  region: null,
  radiusKm: null,
  languages: [],
  categories: [],
  priceMin: null,
  priceMax: null,
  photos: false,
  newOnly: false,
  sort: "relevanz",
  view: "raster",
  page: 1,
};

export type RawParams = Record<string, string | string[] | undefined>;

function all(raw: RawParams, key: string): string[] {
  const value = raw[key];
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((entry) =>
    entry.split(","),
  );
}

function first(raw: RawParams, key: string): string | null {
  return all(raw, key)[0] ?? null;
}

function unique(values: string[], pattern: RegExp): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => pattern.test(value)),
    ),
  ]
    .slice(0, MAX_MULTI)
    .sort();
}

const price = z.coerce.number().int().min(0).max(PRICE_LIMIT);

function parsePrice(raw: string | null): number | null {
  if (raw === null || raw === "") return null;
  const parsed = price.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function pick<T extends string>(
  values: readonly T[],
  raw: string | null,
  fallback: T,
): T {
  return values.includes(raw as T) ? (raw as T) : fallback;
}

/**
 * Liest die Parameter tolerant: Unbekanntes und Ungültiges fällt still weg,
 * damit eine alte oder von Hand gekürzte URL nie in einen Fehler läuft.
 */
export function parseSearchQuery(raw: RawParams): SearchQuery {
  const text =
    first(raw, "q")?.replace(/\s+/g, " ").trim().slice(0, QUERY_MAX) ?? "";
  const region = first(raw, "ort");
  const regionSlug = region && SLUG.test(region) ? region : null;
  const radius = Number(first(raw, "umkreis"));
  let priceMin = parsePrice(first(raw, "preis_min"));
  let priceMax = parsePrice(first(raw, "preis_max"));
  if (priceMin !== null && priceMax !== null && priceMin > priceMax)
    [priceMin, priceMax] = [priceMax, priceMin];
  const page = Number(first(raw, "seite"));
  return {
    q: text.length > 0 ? text : null,
    region: regionSlug,
    // Ein Umkreis ohne Region hätte keinen Mittelpunkt.
    radiusKm:
      regionSlug && (SEARCH_RADII as readonly number[]).includes(radius)
        ? (radius as SearchRadius)
        : null,
    languages: unique(all(raw, "sprache"), LANGUAGE),
    categories: unique(all(raw, "kategorie"), SLUG),
    priceMin,
    priceMax,
    photos: first(raw, "fotos") === "1",
    newOnly: first(raw, "neu") === "1",
    sort: pick(SEARCH_SORTS, first(raw, "sortierung"), "relevanz"),
    view: pick(SEARCH_VIEWS, first(raw, "ansicht"), "raster"),
    page: Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
  };
}

/** Schreibt die Parameter zurück, ohne Voreinstellungen. Gleiche Suche, gleiche URL. */
export function toSearchParams(
  query: SearchQuery,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  if (query.q) params.q = query.q;
  if (query.region) params.ort = query.region;
  if (query.region && query.radiusKm) params.umkreis = String(query.radiusKm);
  if (query.languages.length > 0) params.sprache = query.languages;
  if (query.categories.length > 0) params.kategorie = query.categories;
  if (query.priceMin !== null) params.preis_min = String(query.priceMin);
  if (query.priceMax !== null) params.preis_max = String(query.priceMax);
  if (query.photos) params.fotos = "1";
  if (query.newOnly) params.neu = "1";
  if (query.sort !== "relevanz") params.sortierung = query.sort;
  if (query.view !== "raster") params.ansicht = query.view;
  if (query.page > 1) params.seite = String(query.page);
  return params;
}

/** Nur die Filter, ohne Sortierung, Ansicht und Seite: Grundlage für gespeicherte Suchen. */
export function filtersOnly(query: SearchQuery): SearchQuery {
  return { ...query, sort: EMPTY_QUERY.sort, view: EMPTY_QUERY.view, page: 1 };
}

/** Kanonischer Schlüssel einer Filterkombination; gleiche Filter ergeben denselben Schlüssel. */
export function queryKey(query: SearchQuery): string {
  const params = toSearchParams(filtersOnly(query));
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${[params[key]].flat().join(",")}`)
    .join("&");
}

export type FilterKey =
  | "q"
  | "region"
  | "radiusKm"
  | "languages"
  | "categories"
  | "price"
  | "photos"
  | "newOnly";

/** Aktive Filter in fester Reihenfolge, für Chips und «Alle zurücksetzen». */
export function activeFilters(query: SearchQuery): FilterKey[] {
  const keys: FilterKey[] = [];
  if (query.q) keys.push("q");
  if (query.region) keys.push("region");
  if (query.radiusKm) keys.push("radiusKm");
  if (query.languages.length > 0) keys.push("languages");
  if (query.categories.length > 0) keys.push("categories");
  if (query.priceMin !== null || query.priceMax !== null) keys.push("price");
  if (query.photos) keys.push("photos");
  if (query.newOnly) keys.push("newOnly");
  return keys;
}

/** Entfernt einen Filter; die Seite springt auf 1 zurück. */
export function withoutFilter(query: SearchQuery, key: FilterKey): SearchQuery {
  const next: SearchQuery = { ...query, page: 1 };
  switch (key) {
    case "q":
      next.q = null;
      break;
    case "region":
      next.region = null;
      next.radiusKm = null;
      break;
    case "radiusKm":
      next.radiusKm = null;
      break;
    case "languages":
      next.languages = [];
      break;
    case "categories":
      next.categories = [];
      break;
    case "price":
      next.priceMin = null;
      next.priceMax = null;
      break;
    case "photos":
      next.photos = false;
      break;
    case "newOnly":
      next.newOnly = false;
      break;
  }
  return next;
}
