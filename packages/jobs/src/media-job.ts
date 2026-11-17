import { z } from "zod";
import type { JobDefinition } from "./definitions";

const id = z.string().min(1).max(64);
const key = z.string().min(1).max(512);

/** Payload der Queue `media-process`: nur die ID; der Worker liest alles Weitere aus der Datenbank. */
export const mediaProcessJobSchema = z.object({ mediaId: id });
export type MediaProcessJob = z.infer<typeof mediaProcessJobSchema>;
export const mediaProcessJob: JobDefinition<MediaProcessJob> = {
  queue: "media-process",
  schema: mediaProcessJobSchema,
};

/**
 * Payload der Queue `media-delete`: die Schlüssel stehen in der Payload, damit
 * das Löschen auch gelingt, wenn die Zeile inzwischen weg ist (Konto gelöscht).
 */
export const mediaDeleteJobSchema = z.object({
  mediaId: id,
  originals: z.array(key).max(4),
  derivatives: z.array(key).max(32),
});
export type MediaDeleteJob = z.infer<typeof mediaDeleteJobSchema>;
export const mediaDeleteJob: JobDefinition<MediaDeleteJob> = {
  queue: "media-delete",
  schema: mediaDeleteJobSchema,
};
