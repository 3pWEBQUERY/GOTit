export * from "./query";
export type {
  SearchContext,
  SearchHit,
  SearchPort,
  SearchResult,
  Suggestion,
} from "./types";
export { postgresSearch, toPrefixTsQuery } from "./postgres-search";
export { SUGGEST_MIN_LENGTH } from "./suggest";
export {
  reindexProfile,
  rebuildSearchIndex,
  type IndexOutcome,
} from "./indexer";
export { requestSearchReindex, requestSearchReindexForUser } from "./reindex";
export { completeness, type CompletenessFacts } from "./completeness";
export { distanceKm, resolveRegionFilter } from "./region-filter";
export {
  getLandingCategory,
  getLandingRegion,
  listRegionLanding,
  type LandingRegion,
  type RegionLanding,
} from "./landing";

import { postgresSearch } from "./postgres-search";
import type { SearchPort } from "./types";

/** Die aktive Implementierung der Suche. */
export const searchPort: SearchPort = postgresSearch;
export {
  MAX_SAVED_SEARCHES,
  SAVED_SEARCH_NAME_MAX,
  deleteSavedSearch,
  findSavedSearch,
  listSavedSearches,
  renameSavedSearch,
  saveSearch,
  type SaveSearchResult,
  type SavedSearchSummary,
} from "./saved-search";
