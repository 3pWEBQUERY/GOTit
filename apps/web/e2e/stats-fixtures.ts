import { randomBytes, randomUUID } from "node:crypto";
import { query } from "./admin-fixtures";
import { zurichDay, zurichTime } from "./booking-fixtures";

/**
 * Hilfen für die Specs der Statistik (Entscheid 0019): Rohereignisse per SQL,
 * wie sie `recordStat` schreibt, an bekannten Zürcher Tagen. Solange ein Tag
 * nicht aggregiert ist, zählen die Abfragen genau diese Zeilen.
 */
export type StatKind =
  | "SEARCH_IMPRESSION"
  | "PROFILE_VIEW"
  | "CONTACT_ACTION"
  | "BOOKING_REQUEST"
  | "BOOKING_CONFIRMED"
  | "FAVORITE_ADDED"
  | "FAVORITE_REMOVED"
  | "MEDIA_VIEW";

export interface EventBatch {
  kind: StatKind;
  /** Tage ab heute, zum Beispiel -1 für gestern. */
  day: number;
  count: number;
  searchKey?: string;
  mediaId?: string;
}

export async function insertEvents(
  profileId: string,
  batches: readonly EventBatch[],
): Promise<void> {
  for (const batch of batches) {
    const at = zurichTime(zurichDay(batch.day).day, "12:00");
    for (let index = 0; index < batch.count; index += 1)
      await query(
        `insert into stat_event (id, "providerProfileId", kind, "mediaId", "searchKey", "occurredAt") values ($1, $2, $3::"StatKind", $4, $5, $6)`,
        [
          `e2e_stat_${randomUUID()}`,
          profileId,
          batch.kind,
          batch.mediaId ?? null,
          batch.searchKey ?? null,
          at,
        ],
      );
  }
}

export async function countEvents(
  profileId: string,
  kind: StatKind,
): Promise<number> {
  const [row] = await query<{ count: string }>(
    `select count(*)::text as count from stat_event where "providerProfileId" = $1 and kind = $2::"StatKind"`,
    [profileId, kind],
  );
  return Number(row?.count ?? 0);
}

export async function searchKeys(profileId: string): Promise<string[]> {
  const rows = await query<{ searchKey: string | null }>(
    `select "searchKey" from stat_event where "providerProfileId" = $1 and kind = 'SEARCH_IMPRESSION'`,
    [profileId],
  );
  return rows.map((row) => row.searchKey ?? "");
}

/** Freigegebenes, öffentliches Medium ohne Dateien; für Zählung und Tabelle reicht die Zeile. */
export async function publishedMedia(
  profileId: string,
  ownerId: string,
  altText: string,
  status = "PUBLISHED",
): Promise<string> {
  const id = `e2e_media_${randomUUID()}`;
  await query(
    `insert into media_asset (id, "ownerUserId", "providerProfileId", status, visibility, "sortOrder", "isCover", "altText", "originalKey", width, height, "dominantColor", "rightsConfirmedAt", "updatedAt")
     values ($1, $2, $3, $4::"MediaStatus", 'PUBLIC', 0, true, $5, $6, 320, 400, '#7a6a5c', now(), now())`,
    [
      id,
      ownerId,
      profileId,
      status,
      altText,
      `o/${randomBytes(24).toString("base64url")}`,
    ],
  );
  return id;
}

/** Normalisiert geschützte Leerzeichen, wie sie Intl in «25 %» setzt. */
export function plain(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, " ");
}

/** «Mo., 16.11.» wie Achse und Tabelle der Linie. */
export function shortDay(offset: number): string {
  return new Intl.DateTimeFormat("de-CH", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${zurichDay(offset).day}T12:00:00Z`));
}
