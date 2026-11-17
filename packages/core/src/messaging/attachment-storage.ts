import { getStorage } from "@app/storage";
import { createLogger } from "../observability";

const logger = createLogger("messaging");

/** Chat-Bilder liegen nur im privaten Bucket «originals», unter `chat/`. */
export const CHAT_PREFIX = "chat/";

/** Entfernt Original und bearbeitete Fassung. Fehler bleiben im Log; der Cron-Dienst räumt Verwaiste nach. */
export async function removeAttachmentObjects(
  attachments: ReadonlyArray<{
    originalKey: string;
    processedKey: string | null;
  }>,
): Promise<void> {
  for (const attachment of attachments) {
    for (const key of [attachment.originalKey, attachment.processedKey]) {
      if (!key) continue;
      try {
        await getStorage().deleteObject({ bucket: "originals", key });
      } catch (error) {
        logger.error("attachment_delete_failed", {
          error: error instanceof Error ? error.name : "unknown",
        });
      }
    }
  }
}
