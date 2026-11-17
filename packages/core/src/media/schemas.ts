import { z } from "zod";

/** Grenzen des Uploads (PRD v2 14.3): Typen, Grösse, Kontingent pro Profil. */
export const MEDIA_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
export type MediaContentType = (typeof MEDIA_CONTENT_TYPES)[number];
export const MEDIA_MAX_BYTES = 20 * 1024 * 1024;
export const MEDIA_QUOTA = 60;
/** Gültigkeit der Upload-URL in Sekunden. */
export const UPLOAD_URL_TTL_SECONDS = 600;
/** Ein nie bestätigter Upload belegt das Kontingent nur so lange. */
export const STALE_UPLOAD_MS = 60 * 60 * 1000;
export const ALT_TEXT_MAX = 300;

/** Gründe eines fehlgeschlagenen Mediums; Schlüssel, nie Dateiinhalt (Übersetzung unter `media.failure.<grund>`). */
export const MEDIA_FAILURE_REASONS = ["unsupported-type", "too-large", "unreadable", "heic-unsupported", "missing-original"] as const;
export type MediaFailureReason = (typeof MEDIA_FAILURE_REASONS)[number];

const visibility = z.enum(["PUBLIC", "MEMBERS"]);
export const mediaIdSchema = z.string().min(1).max(64);

/** Ein Schema pro Vorgang, geteilt zwischen Oberfläche und Kern (PRD 4.2). */
export const requestUploadSchema = z.object({
  contentType: z.enum(MEDIA_CONTENT_TYPES, { error: "type" }),
  sizeBytes: z.number({ error: "size" }).int("size").min(1, "size").max(MEDIA_MAX_BYTES, "size"),
  // Pflicht nach PRD v1 FR-MEDIA-002: Rechte und Einwilligungen aller abgebildeten Personen.
  rightsConfirmed: z.literal(true, { error: "rights" }),
  visibility: visibility.default("PUBLIC"),
});
export type RequestUploadInput = z.input<typeof requestUploadSchema>;

export const altTextSchema = z.object({ altText: z.string().trim().max(ALT_TEXT_MAX, "altTextTooLong") });
export const visibilitySchema = z.object({ visibility });
export const reorderSchema = z.object({ order: z.array(mediaIdSchema).min(1).max(MEDIA_QUOTA * 2) });
export const moveSchema = z.object({ direction: z.enum(["forward", "backward"]) });
export const bulkSchema = z.object({ mediaIds: z.array(mediaIdSchema).min(1).max(MEDIA_QUOTA * 2) });

export const MEDIA_DECISIONS = ["PUBLISHED", "CHANGES_REQUESTED", "BLOCKED"] as const;
export type MediaDecision = (typeof MEDIA_DECISIONS)[number];

export const mediaDecisionSchema = z.object({
  decision: z.enum(MEDIA_DECISIONS, { error: "decisionRequired" }),
  reason: z.string({ error: "reasonTooShort" }).trim().min(10, "reasonTooShort").max(2000, "reasonTooLong"),
  // Regelbezug (PRD v2 12.4); die Oberfläche verlangt ihn, der Kern speichert ihn im Audit-Log.
  rule: z.string().trim().min(1).max(120).optional(),
});
export type MediaDecisionInput = z.input<typeof mediaDecisionSchema>;
