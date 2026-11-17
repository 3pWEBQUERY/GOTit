import { z } from "zod";

/** Grenzen und Eingaben des Messengers (PRD v1 5.7, v2 11.4). Browsertauglich, ohne Servercode. */
export const MESSAGE_MAX_LENGTH = 4000;
export const MAX_ATTACHMENTS_PER_MESSAGE = 4;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const LABEL_NAME_MAX = 30;
export const MAX_LABELS = 20;
export const NOTE_MAX_LENGTH = 2000;
export const THREAD_PAGE_SIZE = 50;
export const SEARCH_MAX_LENGTH = 80;

export const idSchema = z.string().min(1).max(64);

export const sendMessageSchema = z
  .object({
    body: z
      .string()
      .max(MESSAGE_MAX_LENGTH, "too-long")
      .transform((value) => value.replace(/\r\n/g, "\n").trim()),
    // Vom Browser vergeben (zum Beispiel crypto.randomUUID()); macht erneutes Senden idempotent.
    clientId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "client-id"),
    attachmentIds: z
      .array(idSchema)
      .max(MAX_ATTACHMENTS_PER_MESSAGE, "too-many-attachments")
      .default([]),
  })
  .refine((value) => value.body.length > 0 || value.attachmentIds.length > 0, {
    message: "empty",
    path: ["body"],
  });
export type SendMessageInput = z.input<typeof sendMessageSchema>;

export const labelNameSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "required").max(LABEL_NAME_MAX, "too-long"));

export const noteSchema = z
  .string()
  .max(NOTE_MAX_LENGTH, "too-long")
  .transform((value) => value.trim());

export const attachmentUploadSchema = z.object({
  contentType: z.enum(ATTACHMENT_TYPES, { message: "type" }),
  sizeBytes: z.number().int().min(1, "size").max(ATTACHMENT_MAX_BYTES, "size"),
});

export const INBOX_VIEWS = [
  "alle",
  "ungelesen",
  "favoriten",
  "archiviert",
] as const;
export type InboxView = (typeof INBOX_VIEWS)[number];

/** Gründe einer Meldung (PRD v2 11.4, Abschnitt 13). Dringende kommen in der Moderation zuerst. */
export const REPORT_REASONS = [
  "spam",
  "harassment",
  "scam",
  "impersonation",
  "minor",
  "exploitation",
  "danger",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const URGENT_REPORT_REASONS: readonly ReportReason[] = [
  "minor",
  "exploitation",
  "danger",
];

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: z
    .string()
    .max(1000)
    .transform((value) => value.trim())
    .default(""),
});

/** Standard-Labels eines Anbieters (PRD v2 11.4); frei umbenennbar. */
export const DEFAULT_LABEL_KEYS = [
  "new-request",
  "appointment-open",
  "confirmed",
  "needs-reply",
] as const;
