import { randomBytes } from "node:crypto";
import { getDb } from "@app/db";
import { chatAttachmentJob, enqueue } from "@app/jobs";
import { getStorage } from "@app/storage";
import { isBlockedBetween, participantOf } from "./access";
import { CHAT_PREFIX, removeAttachmentObjects } from "./attachment-storage";
import {
  ATTACHMENT_MAX_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  attachmentUploadSchema,
  idSchema,
} from "./schemas";

/**
 * Bilder im Chat (v1 FR-CHAT-001). Ablauf wie bei den Profilmedien (Entscheid
 * 0011): signierte URL für den direkten Upload in den privaten Bucket, dann
 * Bestätigung, dann entfernt der Worker EXIF und GPS und kodiert neu. Erst dann
 * lässt sich das Bild senden. Eine Moderation vor dem Senden gibt es nicht; die
 * Gegenseite kann melden.
 */
const UPLOAD_URL_TTL_SECONDS = 600;
const DOWNLOAD_URL_TTL_SECONDS = 60;
/** Nie gesendete Bilder entfernt der Cron-Dienst nach dieser Zeit. */
export const UNSENT_ATTACHMENT_MS = 24 * 3600 * 1000;

export type RequestAttachmentResult =
  | {
      ok: true;
      attachmentId: string;
      upload: { url: string; method: "PUT"; headers: Record<string, string> };
    }
  | {
      ok: false;
      reason: "not-found" | "type" | "size" | "limit" | "undeliverable";
    };

export async function requestAttachmentUpload(
  userId: string,
  conversationId: string,
  input: unknown,
): Promise<RequestAttachmentResult> {
  const parsed = attachmentUploadSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      reason: parsed.error.issues.some((issue) => issue.message === "type")
        ? "type"
        : "size",
    };
  const participation = await participantOf(userId, conversationId);
  if (!participation) return { ok: false, reason: "not-found" };
  if (await isBlockedBetween(userId, participation.counterpartId))
    return { ok: false, reason: "undeliverable" };
  const db = getDb();
  const pending = await db.messageAttachment.count({
    where: {
      ownerUserId: userId,
      conversationId,
      messageId: null,
      status: { not: "FAILED" },
    },
  });
  if (pending >= MAX_ATTACHMENTS_PER_MESSAGE)
    return { ok: false, reason: "limit" };
  const attachment = await db.messageAttachment.create({
    data: {
      ownerUserId: userId,
      conversationId,
      originalKey: `${CHAT_PREFIX}o/${randomBytes(24).toString("base64url")}`,
      mimeType: parsed.data.contentType,
      sizeBytes: parsed.data.sizeBytes,
    },
    select: { id: true, originalKey: true },
  });
  const upload = await getStorage().presignUpload({
    bucket: "originals",
    key: attachment.originalKey,
    contentType: parsed.data.contentType,
    maxBytes: ATTACHMENT_MAX_BYTES,
    contentLength: parsed.data.sizeBytes,
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });
  return { ok: true, attachmentId: attachment.id, upload };
}

/** Der Browser meldet den fertigen Upload; nur ein Aufruf gewinnt. */
export async function confirmAttachment(
  userId: string,
  attachmentId: string,
): Promise<boolean> {
  if (!idSchema.safeParse(attachmentId).success) return false;
  const db = getDb();
  const attachment = await db.messageAttachment.findFirst({
    where: { id: attachmentId, ownerUserId: userId, status: "UPLOADING" },
    select: { id: true, originalKey: true },
  });
  if (!attachment) return false;
  const object = await getStorage().headObject({
    bucket: "originals",
    key: attachment.originalKey,
  });
  if (!object || object.size === 0 || object.size > ATTACHMENT_MAX_BYTES) {
    await db.messageAttachment.updateMany({
      where: { id: attachment.id, status: "UPLOADING" },
      data: {
        status: "FAILED",
        failureReason: object ? "too-large" : "missing",
      },
    });
    return false;
  }
  const { count } = await db.messageAttachment.updateMany({
    where: { id: attachment.id, status: "UPLOADING" },
    data: { status: "PROCESSING", sizeBytes: object.size },
  });
  if (count === 0) return false;
  try {
    await enqueue(chatAttachmentJob, { attachmentId: attachment.id });
  } catch (error) {
    await db.messageAttachment.updateMany({
      where: { id: attachment.id, status: "PROCESSING" },
      data: { status: "UPLOADING" },
    });
    throw error;
  }
  return true;
}

/** Zustand eigener, noch nicht gesendeter Bilder, für die Vorschau im Composer. */
export async function pendingAttachments(
  userId: string,
  conversationId: string,
) {
  if (!(await participantOf(userId, conversationId))) return [];
  return getDb().messageAttachment.findMany({
    where: { ownerUserId: userId, conversationId, messageId: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      failureReason: true,
      width: true,
      height: true,
    },
  });
}

/** Ungesendetes eigenes Bild verwerfen. */
export async function discardAttachment(
  userId: string,
  attachmentId: string,
): Promise<boolean> {
  if (!idSchema.safeParse(attachmentId).success) return false;
  const db = getDb();
  const attachment = await db.messageAttachment.findFirst({
    where: { id: attachmentId, ownerUserId: userId, messageId: null },
    select: { id: true, originalKey: true, processedKey: true },
  });
  if (!attachment) return false;
  await db.messageAttachment.delete({ where: { id: attachment.id } });
  await removeAttachmentObjects([attachment]);
  return true;
}

/**
 * Kurzlebige URL für ein Chat-Bild, nur für Beteiligte. Gesendete Bilder sehen
 * beide Seiten, ungesendete nur die Person, die sie hochgeladen hat.
 */
export async function attachmentDownloadUrl(
  userId: string,
  attachmentId: string,
): Promise<string | null> {
  if (!idSchema.safeParse(attachmentId).success) return null;
  const attachment = await getDb().messageAttachment.findFirst({
    where: { id: attachmentId, status: "READY", processedKey: { not: null } },
    select: {
      conversationId: true,
      ownerUserId: true,
      messageId: true,
      processedKey: true,
      message: { select: { deletedAt: true } },
    },
  });
  if (!attachment?.processedKey || attachment.message?.deletedAt) return null;
  if (!attachment.messageId && attachment.ownerUserId !== userId) return null;
  if (!(await participantOf(userId, attachment.conversationId))) return null;
  return getStorage().presignDownload({
    bucket: "originals",
    key: attachment.processedKey,
    expiresIn: DOWNLOAD_URL_TTL_SECONDS,
  });
}

/** Für den Worker: Daten zur Verarbeitung. */
export async function attachmentForProcessing(attachmentId: string) {
  return getDb().messageAttachment.findFirst({
    where: { id: attachmentId, status: "PROCESSING" },
    select: { id: true, originalKey: true },
  });
}

export async function completeAttachment(
  attachmentId: string,
  result: {
    processedKey: string;
    mimeType: string;
    width: number;
    height: number;
    sizeBytes: number;
  },
): Promise<boolean> {
  const { count } = await getDb().messageAttachment.updateMany({
    where: { id: attachmentId, status: "PROCESSING" },
    data: { status: "READY", ...result },
  });
  return count > 0;
}

export async function failAttachment(
  attachmentId: string,
  reason: string,
): Promise<void> {
  await getDb().messageAttachment.updateMany({
    where: { id: attachmentId, status: "PROCESSING" },
    data: { status: "FAILED", failureReason: reason },
  });
}

/** Cron: nie gesendete Bilder nach 24 Stunden entfernen (v1 FR-CHAT-005, bereinigbare Anhänge). */
export async function purgeUnsentAttachments(
  now = new Date(),
): Promise<number> {
  const db = getDb();
  const stale = await db.messageAttachment.findMany({
    where: {
      messageId: null,
      createdAt: { lt: new Date(now.getTime() - UNSENT_ATTACHMENT_MS) },
    },
    select: { id: true, originalKey: true, processedKey: true },
  });
  if (stale.length === 0) return 0;
  await db.messageAttachment.deleteMany({
    where: { id: { in: stale.map((entry) => entry.id) } },
  });
  await removeAttachmentObjects(stale);
  return stale.length;
}
