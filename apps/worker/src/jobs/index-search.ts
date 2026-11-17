import { reindexProfile } from "@app/core/search/indexer";
import type { SearchIndexJob } from "@app/jobs";

/** Queue `search-index`: zieht die Zeile eines Profils im Suchindex nach oder entfernt sie (PRD v2 14.4). */
export function createIndexSearchJob() {
  return async ({ providerProfileId }: SearchIndexJob): Promise<void> => {
    await reindexProfile(providerProfileId);
  };
}
