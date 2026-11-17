import {
  attachmentForProcessing,
  completeAttachment,
  failAttachment,
} from "@app/core/messaging";
import { createLogger } from "@app/core/observability";
import type { ChatAttachmentJob } from "@app/jobs";
import type { ObjectStorage } from "@app/storage";
import { processChatImage } from "../media/process-chat-image";

const logger = createLogger("worker");

/**
 * Queue `chat-attachment`: Bild laden, bereinigen, die WebP-Fassung neben das
 * Original legen und das Original löschen. Unzulässiges endet in FAILED.
 * Speicherfehler werfen, damit BullMQ es erneut versucht. Protokolliert nur
 * ID und Grund.
 */
export function createProcessChatAttachmentJob(storage: () => ObjectStorage) {
  return async ({ attachmentId }: ChatAttachmentJob): Promise<void> => {
    const attachment = await attachmentForProcessing(attachmentId);
    if (!attachment) return;
    const original = {
      bucket: "originals",
      key: attachment.originalKey,
    } as const;
    const input = await storage().getObject(original);
    const result = input
      ? await processChatImage(input)
      : ({ ok: false, reason: "unreadable" } as const);
    if (!result.ok) {
      await failAttachment(attachmentId, result.reason);
      await storage().deleteObject(original);
      logger.warn("chat_attachment_failed", {
        attachmentId,
        reason: result.reason,
      });
      return;
    }
    const processedKey = `${attachment.originalKey}.webp`;
    await storage().putObject({
      bucket: "originals",
      key: processedKey,
      body: result.body,
      contentType: "image/webp",
    });
    if (
      await completeAttachment(attachmentId, {
        processedKey,
        mimeType: "image/webp",
        width: result.width,
        height: result.height,
        sizeBytes: result.body.byteLength,
      })
    ) {
      await storage().deleteObject(original);
    } else {
      await storage().deleteObject({ bucket: "originals", key: processedKey });
    }
  };
}
