import { createLogger } from "@app/core/observability";
import { completeProcessing, failProcessing, loadForProcessing, newVariantPrefix } from "@app/core/media";
import type { MediaProcessJob } from "@app/jobs";
import type { ObjectStorage } from "@app/storage";
import { processImage } from "../media/process-image";

const logger = createLogger("worker");

/**
 * Queue `media-process`: Original laden, prüfen, Varianten nach «derivatives»
 * schreiben, das Original durch die bereinigte Fassung ersetzen und das Medium
 * auf IN_REVIEW setzen. Unzulässiges endet in FAILED, das Original wird
 * gelöscht. Speicherfehler werfen, damit BullMQ es erneut versucht. Protokolliert
 * nur ID und Grund, nie Inhalt oder Dateinamen.
 */
export function createProcessMediaJob(storage: () => ObjectStorage) {
  return async ({ mediaId }: MediaProcessJob): Promise<void> => {
    const media = await loadForProcessing(mediaId);
    if (!media) return;
    const original = { bucket: "originals", key: media.originalKey } as const;
    const input = await storage().getObject(original);
    const result = input ? await processImage(input) : ({ ok: false, reason: "missing-original" } as const);
    if (!result.ok) {
      await failProcessing(mediaId, result.reason);
      await storage().deleteObject(original);
      logger.warn("media_failed", { mediaId, reason: result.reason });
      return;
    }
    const { image } = result;
    const prefix = newVariantPrefix(mediaId);
    const variants = image.variants.map((variant) => ({ ...variant, key: `${prefix}/${variant.name}` }));
    for (const variant of variants) {
      await storage().putObject({ bucket: "derivatives", key: variant.key, body: variant.body, contentType: `image/${variant.format}` });
    }
    // Das Original bleibt privat und wird nie ausgeliefert; auch dort bleiben keine EXIF- oder GPS-Daten.
    await storage().putObject({ ...original, body: image.sanitized.body, contentType: image.sanitized.contentType });
    const done = await completeProcessing(mediaId, {
      mimeType: image.sanitized.contentType,
      sizeBytes: image.sanitized.body.byteLength,
      width: image.width,
      height: image.height,
      dominantColor: image.dominantColor,
      variants: variants.map(({ name, width, height, format, key, body }) => ({ name, width, height, format, key, bytes: body.byteLength })),
    });
    const obsolete = done.ok ? done.replacedKeys : variants.map((variant) => variant.key);
    for (const key of obsolete) await storage().deleteObject({ bucket: "derivatives", key });
    logger.info(done.ok ? "media_processed" : "media_gone", { mediaId, variants: variants.length });
  };
}
