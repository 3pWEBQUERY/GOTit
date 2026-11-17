import { getDb } from "@app/db";
import { enqueue, mediaProcessJob } from "@app/jobs";
import { getStorage } from "@app/storage";
import { newOriginalKey } from "./keys";
import { ownMediaWhere, ownProfile } from "./owner";
import { MEDIA_MAX_BYTES, MEDIA_QUOTA, STALE_UPLOAD_MS, UPLOAD_URL_TTL_SECONDS, requestUploadSchema } from "./schemas";

export type RequestUploadResult =
  | { ok: true; mediaId: string; upload: { url: string; method: "PUT"; headers: Record<string, string> } }
  | { ok: false; reason: "no-profile" | "not-allowed" | "type" | "size" | "rights" | "quota" };

/** Medien, die das Kontingent belegen: nicht gelöscht, nicht fehlgeschlagen, keine verwaisten Uploads. */
export async function countQuotaMedia(providerProfileId: string, now = new Date()): Promise<number> {
  return getDb().mediaAsset.count({
    where: {
      providerProfileId,
      deletedAt: null,
      status: { not: "FAILED" },
      OR: [{ status: { not: "UPLOADING" } }, { createdAt: { gt: new Date(now.getTime() - STALE_UPLOAD_MS) } }],
    },
  });
}

function inputReason(issues: readonly { message: string }[]): "type" | "size" | "rights" {
  const messages = new Set(issues.map((issue) => issue.message));
  if (messages.has("rights")) return "rights";
  if (messages.has("type")) return "type";
  return "size";
}

/**
 * Schritt 1 des Uploads (PRD v2 14.3): prüft Profil, Typ, Grösse, Kontingent
 * und die Bestätigung der Rechte, legt das Medium im Status UPLOADING an und
 * gibt eine kurzlebige URL für den direkten Upload in «originals».
 */
export async function requestUpload(userId: string, input: unknown, now = new Date()): Promise<RequestUploadResult> {
  const parsed = requestUploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: inputReason(parsed.error.issues) };
  const profile = await ownProfile(userId);
  if (!profile) return { ok: false, reason: "no-profile" };
  if (!profile.canUpload) return { ok: false, reason: "not-allowed" };
  const db = getDb();
  if ((await countQuotaMedia(profile.id, now)) >= MEDIA_QUOTA) return { ok: false, reason: "quota" };
  const { contentType, sizeBytes, visibility } = parsed.data;
  const last = await db.mediaAsset.findFirst({ where: { providerProfileId: profile.id, deletedAt: null }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const media = await db.mediaAsset.create({
    data: {
      ownerUserId: userId,
      providerProfileId: profile.id,
      status: "UPLOADING",
      visibility,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      mimeType: contentType,
      sizeBytes,
      originalKey: newOriginalKey(),
      rightsConfirmedAt: now,
    },
    select: { id: true, originalKey: true },
  });
  const upload = await getStorage().presignUpload({
    bucket: "originals",
    key: media.originalKey,
    contentType,
    maxBytes: MEDIA_MAX_BYTES,
    contentLength: sizeBytes,
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });
  return { ok: true, mediaId: media.id, upload };
}

export type ConfirmUploadResult = { ok: true } | { ok: false; reason: "not-found" | "missing" | "too-large" };

/**
 * Schritt 2: Der Browser meldet den fertigen Upload. Prüft Eigentum und ob das
 * Objekt wirklich vorliegt, setzt PROCESSING und legt den Job an. Nur ein
 * Aufruf gewinnt (Bedingung auf UPLOADING).
 */
export async function confirmUpload(userId: string, mediaId: string): Promise<ConfirmUploadResult> {
  const db = getDb();
  const media = await db.mediaAsset.findFirst({ where: { ...ownMediaWhere(userId, mediaId), status: "UPLOADING" }, select: { id: true, originalKey: true } });
  if (!media) return { ok: false, reason: "not-found" };
  const object = await getStorage().headObject({ bucket: "originals", key: media.originalKey });
  if (!object || object.size === 0) return { ok: false, reason: "missing" };
  if (object.size > MEDIA_MAX_BYTES) {
    await db.mediaAsset.updateMany({ where: { id: media.id, status: "UPLOADING" }, data: { status: "FAILED", failureReason: "too-large" } });
    await getStorage().deleteObject({ bucket: "originals", key: media.originalKey });
    return { ok: false, reason: "too-large" };
  }
  const { count } = await db.mediaAsset.updateMany({ where: { id: media.id, status: "UPLOADING" }, data: { status: "PROCESSING", sizeBytes: object.size } });
  if (count === 0) return { ok: false, reason: "not-found" };
  try {
    await enqueue(mediaProcessJob, { mediaId: media.id });
  } catch (error) {
    // Ohne Job bliebe das Medium in PROCESSING hängen; zurück, damit der Browser erneut bestätigen kann.
    await db.mediaAsset.updateMany({ where: { id: media.id, status: "PROCESSING" }, data: { status: "UPLOADING" } });
    throw error;
  }
  return { ok: true };
}
