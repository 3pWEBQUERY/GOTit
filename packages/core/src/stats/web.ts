import { getDb } from "@app/db";
import { filtersOnly, queryKey, type SearchQuery } from "../search/query";
import {
  recordMediaView,
  recordProfileView,
  recordSearchImpressions,
} from "./record";

/**
 * Erfassen aus der Web-App (Entscheid 0019). Die Oberfläche kennt Profile nur
 * über ihren Slug; die IDs bleiben im Kern und erreichen nie den Browser.
 * Wer etwas sehen darf, prüft die Web-App vorher mit denselben Regeln wie die
 * Seite selbst.
 */

/**
 * Schlüssel einer Suche ohne Filter. Ein leerer Schlüssel gälte in den
 * Tageszahlen als «keine Dimension»; «-» ist nie ein gültiger Filterschlüssel.
 */
export const UNFILTERED_SEARCH_KEY = "-";

/** Schlüssel einer Suche für die Einblendungen: nur die Filter, nie der Freitext. */
export function impressionSearchKey(query: SearchQuery): string {
  return queryKey({ ...filtersOnly(query), q: null }) || UNFILTERED_SEARCH_KEY;
}

/** Einblendungen der gezeigten Treffer einer Ergebnisseite. */
export async function recordSearchImpressionsForSlugs(
  slugs: readonly string[],
  query: SearchQuery,
  now = new Date(),
): Promise<void> {
  if (slugs.length === 0) return;
  const rows = await getDb().searchProfile.findMany({
    where: { slug: { in: [...new Set(slugs)] } },
    select: { providerProfileId: true },
  });
  await recordSearchImpressions(
    rows.map((row) => row.providerProfileId),
    impressionSearchKey(query),
    now,
  );
}

/** Profilaufruf eines Besuchers; die eigenen Aufrufe schliesst der Aufrufer aus. */
export async function recordProfileViewForSlug(
  slug: string,
  visitorKey: string,
  now = new Date(),
): Promise<void> {
  const profile = await getDb().providerProfile.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (profile) await recordProfileView(profile.id, visitorKey, now);
}

/** Medienaufruf in der Lightbox: nur ein freigegebenes Medium genau dieses Profils. */
export async function recordMediaViewForSlug(
  slug: string,
  mediaId: string,
  visitorKey: string,
  now = new Date(),
): Promise<boolean> {
  const media = await getDb().mediaAsset.findFirst({
    where: {
      id: mediaId,
      status: "PUBLISHED",
      deletedAt: null,
      providerProfile: { slug },
    },
    select: { providerProfileId: true },
  });
  if (!media?.providerProfileId) return false;
  await recordMediaView(media.providerProfileId, mediaId, visitorKey, now);
  return true;
}
