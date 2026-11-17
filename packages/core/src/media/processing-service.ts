import { getDb } from "@app/db";
import { ensureCover } from "./library-service";
import type { MediaFailureReason } from "./schemas";

/** Was der Worker für ein Medium braucht; null, wenn es nicht (mehr) verarbeitet werden soll. */
export async function loadForProcessing(mediaId: string) {
  return getDb().mediaAsset.findFirst({
    where: { id: mediaId, status: "PROCESSING", deletedAt: null },
    select: { id: true, originalKey: true, variants: { select: { key: true } } },
  });
}

export interface ProcessedVariant {
  name: string;
  width: number;
  height: number;
  format: string;
  key: string;
  bytes: number;
}

export interface ProcessedMedia {
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  dominantColor: string;
  variants: readonly ProcessedVariant[];
}

/**
 * Varianten fertig: ersetzt frühere Varianten, setzt IN_REVIEW (PRD v2 14.3,
 * Schritt 3) und gibt die Schlüssel ersetzter Varianten zum Löschen zurück.
 * false, wenn das Medium inzwischen gelöscht wurde.
 */
export async function completeProcessing(mediaId: string, result: ProcessedMedia): Promise<{ ok: boolean; replacedKeys: string[] }> {
  return getDb().$transaction(async (tx) => {
    const previous = await tx.mediaVariant.findMany({ where: { mediaId }, select: { key: true } });
    const { count } = await tx.mediaAsset.updateMany({
      where: { id: mediaId, status: "PROCESSING", deletedAt: null },
      data: { status: "IN_REVIEW", mimeType: result.mimeType, sizeBytes: result.sizeBytes, width: result.width, height: result.height, dominantColor: result.dominantColor, failureReason: null },
    });
    if (count === 0) return { ok: false, replacedKeys: [] };
    await tx.mediaVariant.deleteMany({ where: { mediaId } });
    await tx.mediaVariant.createMany({ data: result.variants.map((variant) => ({ ...variant, mediaId })) });
    const media = await tx.mediaAsset.findUniqueOrThrow({ where: { id: mediaId }, select: { providerProfileId: true } });
    if (media.providerProfileId) await ensureCover(tx, media.providerProfileId);
    return { ok: true, replacedKeys: previous.map((variant) => variant.key) };
  });
}

/** Unlesbar oder unzulässig: FAILED mit Grund-Schlüssel, nie mit Dateiinhalt oder Dateiname. */
export async function failProcessing(mediaId: string, reason: MediaFailureReason): Promise<void> {
  await getDb().mediaAsset.updateMany({ where: { id: mediaId, status: "PROCESSING" }, data: { status: "FAILED", failureReason: reason, isCover: false } });
}

/** Nach dem Löschen der Objekte: Varianten entfernen und im Protokoll bestätigen (PRD v2 14.3, Schritt 5). */
export async function confirmPurged(mediaId: string): Promise<void> {
  const db = getDb();
  await db.mediaVariant.deleteMany({ where: { mediaId } });
  await db.auditEvent.create({ data: { actorId: null, action: "media.purged", target: `media:${mediaId}` } });
}
