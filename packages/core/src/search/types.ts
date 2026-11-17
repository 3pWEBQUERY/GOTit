import type { Viewer } from "../identity/types";
import type { Locale } from "../locale";
import type { FilterKey, SearchQuery } from "./query";

/** Eine Karte in der Ergebnisliste (PRD v2 9.3). Nur öffentliche, freigegebene Daten. */
export interface SearchHit {
  slug: string;
  displayName: string;
  /** Region so allgemein, wie der Anbieter sie freigibt, in der Sprache der Oberfläche. */
  regionName: string | null;
  locationLabel: string | null;
  shortDescription: string | null;
  languages: string[];
  priceFromChf: number | null;
  /** Jedes Profil im Index hat eine gültige Identitätsprüfung. */
  identityChecked: true;
  photosChecked: boolean;
  cover: { mediaId: string; color: string | null; alt: string | null } | null;
}

export interface SearchResult {
  hits: SearchHit[];
  /** Treffer insgesamt (ohne bezahlte Platzierungen, PRD v2 9.2). */
  total: number;
  /** Geladene Seiten: 1 bis `query.page`. */
  page: number;
  hasMore: boolean;
  /**
   * Nur bei null Treffern: der Filter, dessen Entfernen die meisten Treffer
   * brächte, mit dieser Trefferzahl (PRD v2 9.2, Leerzustand).
   */
  mostRestrictive: { key: FilterKey; total: number } | null;
}

export interface SearchContext {
  viewer: Viewer;
  locale: Locale;
  now?: Date;
}

export type Suggestion =
  | { kind: "region"; slug: string; name: string; cantonSlug: string | null }
  | { kind: "category"; slug: string; name: string }
  | { kind: "profile"; slug: string; name: string };

/**
 * Schnittstelle der Suche (PRD v2 14.4). Die erste Implementierung nutzt
 * Postgres; Meilisearch käme hinter dieselbe Schnittstelle.
 */
export interface SearchPort {
  search(query: SearchQuery, context: SearchContext): Promise<SearchResult>;
  count(query: SearchQuery, context: SearchContext): Promise<number>;
  suggest(text: string, context: SearchContext): Promise<Suggestion[]>;
}
