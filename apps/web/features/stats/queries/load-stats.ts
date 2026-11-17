import type { Locale } from "@app/core/locale";
import { mediaUrl } from "@app/core/media";
import { parseSearchQuery } from "@app/core/search";
import {
  ownStatsOverview,
  previousRange,
  type DayRange,
  type StatsOverview,
} from "@app/core/stats";
import { getDb } from "@app/db";
import { loadDescribeContext } from "../../favorites/lib/describe-context";
import { describeSearch } from "../../favorites/lib/describe-search";

export interface SearchRow {
  key: string;
  /** Die Filter in Worten, zum Beispiel «Zürich · spricht Deutsch»; ohne Filter «Ohne Filter». */
  description: string;
  impressions: number;
}

export interface MediaRow {
  id: string;
  src: string;
  /** Alternativtext des Mediums; `null`: keiner gepflegt. */
  alt: string | null;
  views: number;
}

export interface StatsData {
  overview: StatsOverview;
  previous: DayRange;
  searches: SearchRow[];
  media: MediaRow[];
}

/** Schlüssel `ort=…&sprache=de,en` zurück zur Suche, um ihn mit denselben Worten wie gespeicherte Suchen zu beschreiben. */
function queryOfKey(key: string) {
  const raw: Record<string, string> = {};
  for (const [name, value] of new URLSearchParams(key)) raw[name] = value;
  return parseSearchQuery(raw);
}

/**
 * Alles für die Statistik des eigenen Profils (PRD v2 11.6): Kennzahlen,
 * Trichter, Tageswerte und die beiden Tabellen. Nur Summen; Medien nur des
 * eigenen Profils. Ohne Profil `null`.
 */
export async function loadStats(
  userId: string,
  locale: Locale,
  range: DayRange,
): Promise<StatsData | null> {
  const overview = await ownStatsOverview(userId, range);
  if (!overview) return null;
  const [context, mediaRows] = await Promise.all([
    overview.searches.length > 0 ? loadDescribeContext(locale) : null,
    overview.media.length > 0
      ? getDb().mediaAsset.findMany({
          where: {
            id: { in: overview.media.map((entry) => entry.mediaId) },
            providerProfile: { userId },
            deletedAt: null,
          },
          select: { id: true, altText: true },
        })
      : [],
  ]);
  const known = new Map(mediaRows.map((row) => [row.id, row]));
  return {
    overview,
    previous: previousRange(range),
    searches: overview.searches.map((entry) => ({
      key: entry.searchKey,
      description: context
        ? describeSearch(queryOfKey(entry.searchKey), context).join(" · ")
        : "",
      impressions: entry.impressions,
    })),
    // Gelöschte Medien fehlen: Es gibt nichts mehr zu zeigen.
    media: overview.media.flatMap((entry) => {
      const row = known.get(entry.mediaId);
      return row
        ? [
            {
              id: row.id,
              src: mediaUrl(row.id, 320, "webp"),
              alt: row.altText,
              views: entry.views,
            },
          ]
        : [];
    }),
  };
}
