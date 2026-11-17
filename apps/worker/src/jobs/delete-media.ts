import { confirmPurged } from "@app/core/media";
import type { MediaDeleteJob } from "@app/jobs";
import type { ObjectStorage } from "@app/storage";

/** Queue `media-delete`: entfernt Original und alle Varianten und bestätigt es im Protokoll (PRD v2 14.3, Schritt 5). */
export function createDeleteMediaJob(storage: () => ObjectStorage) {
  return async ({
    mediaId,
    originals,
    derivatives,
  }: MediaDeleteJob): Promise<void> => {
    for (const key of originals)
      await storage().deleteObject({ bucket: "originals", key });
    for (const key of derivatives)
      await storage().deleteObject({ bucket: "derivatives", key });
    await confirmPurged(mediaId);
  };
}
