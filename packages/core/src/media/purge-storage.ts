import { getDb } from "@app/db";
import { getStorage } from "@app/storage";
import { createLogger } from "../observability";

const logger = createLogger("media");

/**
 * Entfernt Originale und Varianten aller Medien der Konten aus den Buckets,
 * bevor die Konten gelöscht werden (Sicherheitsprüfung 1.14). Die Zeilen
 * verschwinden danach mit der Kaskade im Schema; ohne diesen Schritt blieben
 * die Dateien ohne Verweis in den Buckets liegen. Fehler bleiben im Log und
 * brechen die Löschung nicht ab; das Löschen eines fehlenden Objekts ist ohne
 * Wirkung, deshalb auch bei Medien, die schon zur Löschung vorgemerkt sind.
 */
export async function purgeMediaObjectsOfUsers(userIds: readonly string[]): Promise<number> {
  if (userIds.length === 0) return 0;
  const media = await getDb().mediaAsset.findMany({
    where: { ownerUserId: { in: [...userIds] } },
    select: { originalKey: true, variants: { select: { key: true } } },
  });
  const storage = getStorage();
  for (const asset of media) {
    const refs = [{ bucket: "originals" as const, key: asset.originalKey }, ...asset.variants.map((variant) => ({ bucket: "derivatives" as const, key: variant.key }))];
    for (const ref of refs) {
      try {
        await storage.deleteObject(ref);
      } catch (error) {
        logger.error("media_purge_failed", { error: error instanceof Error ? error.name : "unknown" });
      }
    }
  }
  return media.length;
}
