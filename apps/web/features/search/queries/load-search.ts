import { favoriteSlugs } from "@app/core/favorites";
import type { Locale } from "@app/core/locale";
import { createLogger } from "@app/core/observability";
import {
  clientIp,
  consumeRateLimit,
  rateLimitSubject,
} from "@app/core/rate-limit";
import {
  findSavedSearch,
  searchPort,
  type SearchResult,
} from "@app/core/search";
import type { RawParams, SearchQuery } from "@app/core/search/query";
import { headers } from "next/headers";
import { createHref } from "../../shell/nav/href";
import { getViewer } from "../../shell/queries/get-viewer";
import { filterLabels, type FilterLabel } from "../filter-labels";
import { timed } from "../timing";
import {
  presetQuery,
  searchUrl,
  type SearchPaths,
  type SearchPreset,
} from "../url";
import {
  filterLabelSource,
  loadFilterOptions,
  type FilterOptions,
} from "./filter-options";

const log = createLogger("web");

export interface SearchPageReady {
  state: "ready";
  query: SearchQuery;
  result: SearchResult;
  paths: SearchPaths;
  options: FilterOptions;
  chips: FilterLabel[];
  favorites: string[];
  /** Gespeicherte Suche mit genau diesen Filtern. */
  savedId: string | null;
  /** Für Besucher: Anmeldung mit Rückweg; angemeldet: null. */
  signInHref: string | null;
  /** Name der gewählten Region für die Überschrift. */
  regionName: string | null;
}

export type SearchPageData =
  | SearchPageReady
  | { state: "rate-limited"; retryAfterSeconds: number };

/**
 * Lädt eine Suchseite (`/suche`, `/profile`, Landingpages) auf dem Server:
 * Rate Limit pro Client-Adresse, Treffer, Herzen und den Zustand von
 * «Suche speichern». Alle geladenen Seiten kommen aus der URL (`seite`).
 */
export async function loadSearchPage(
  locale: Locale,
  raw: RawParams,
  preset: SearchPreset | null,
): Promise<SearchPageData> {
  const limit = await consumeRateLimit(
    "search",
    rateLimitSubject(clientIp(await headers())),
  );
  if (!limit.allowed)
    return {
      state: "rate-limited",
      retryAfterSeconds: limit.retryAfterSeconds,
    };

  const href = createHref(locale);
  const paths: SearchPaths = { search: href("/suche"), preset };
  const query = presetQuery(raw, preset);
  const viewer = await getViewer();
  const [{ value: result, ms }, options] = await Promise.all([
    timed(() => searchPort.search(query, { viewer, locale })),
    loadFilterOptions(locale),
  ]);
  // Nur die Dauer, keine Suchbegriffe oder Filter (PRD 16.2). Auswertung: docs/performance/messung-1.14.md.
  log.info("search.timing", { durationMs: Math.round(ms * 10) / 10 });
  const [favorites, savedId, source] = await Promise.all([
    favoriteSlugs(
      viewer,
      result.hits.map((hit) => hit.slug),
    ),
    viewer.kind === "account"
      ? findSavedSearch(viewer.userId, query)
      : Promise.resolve(null),
    filterLabelSource(locale, options),
  ]);
  return {
    state: "ready",
    query,
    result,
    paths,
    options,
    chips: filterLabels(query, source),
    favorites: [...favorites],
    savedId,
    signInHref:
      viewer.kind === "account"
        ? null
        : href({
            pathname: "/anmelden",
            query: { weiter: searchUrl(paths, query) },
          }),
    regionName: query.region
      ? (options.regions.find((region) => region.slug === query.region)?.name ??
        null)
      : null,
  };
}
