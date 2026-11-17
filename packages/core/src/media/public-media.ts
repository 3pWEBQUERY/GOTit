import { getDb } from "@app/db";
import type { PublicMedia } from "./types";

/**
 * Freigegebene Medien eines Profils für die Profilseite (PRD v2 10.1), nach
 * `sortOrder`. Nur PUBLISHED und nicht gelöscht. Medien für Mitglieder sind für
 * Nicht-Mitglieder `locked` (PRD v1 FR-MEDIA-004); die Route `/media/[id]/…`
 * prüft die Sitzung zusätzlich selbst.
 */
export async function listProfileMedia(providerProfileId: string, { viewerIsMember }: { viewerIsMember: boolean }): Promise<PublicMedia[]> {
  const rows = await getDb().mediaAsset.findMany({
    where: { providerProfileId, status: "PUBLISHED", deletedAt: null, width: { not: null }, height: { not: null } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, altText: true, width: true, height: true, dominantColor: true, visibility: true, isCover: true },
  });
  return rows.map((row) => ({
    id: row.id,
    altText: row.altText,
    width: row.width ?? 0,
    height: row.height ?? 0,
    dominantColor: row.dominantColor,
    visibility: row.visibility,
    isCover: row.isCover,
    locked: row.visibility === "MEMBERS" && !viewerIsMember,
  }));
}
