import { getDb, type Prisma } from "@app/db";
import { enqueue, mediaProcessJob } from "@app/jobs";
import { getStorage } from "@app/storage";
import { newOriginalKey } from "./keys";
import { ownMediaWhere, ownProfile } from "./owner";
import { MEDIA_MAX_BYTES, MEDIA_QUOTA, STALE_UPLOAD_MS, UPLOAD_URL_TTL_SECONDS, requestUploadSchema, type MediaContentType } from "./schemas";

export type RequestUploadResult =
  | { ok: true; mediaId: string; upload: { url: string; method: "PUT"; headers: Record<string, string> } }
  | { ok: false; reason: "no-profile" | "not-allowed" | "type" | "size" | "rights" | "quota" };

/** Medien, die das Kontingent belegen: nicht gelöscht, nicht fehlgeschlagen, keine verwaisten Uploads. */
export async function countQuotaMedia(providerProfileId: string, now = new Date()): Promise<number> {
  return countQuota({ providerProfileId }, now);
}

/** Wem ein neues Medium gehört: genau einem Anbieterprofil oder genau einer Organisation (Entscheid 0018). */
export type MediaOwnerRef = { providerProfileId: string } | { organizationId: string };

export async function countQuota(owner: MediaOwnerRef, now = new Date()): Promise<number> {
  return getDb().mediaAsset.count({
    where: {
      ...owner,
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
  return createUpload(userId, { providerProfileId: profile.id }, parsed.data, now);
}

export function parseUploadInput(input: unknown) {
  const parsed = requestUploadSchema.safeParse(input);
  return parsed.success ? ({ ok: true, data: parsed.data } as const) : ({ ok: false, reason: inputReason(parsed.error.issues) } as const);
}

/** Legt das Medium im Status UPLOADING für den Eigentümer an und gibt die Upload-URL; prüft das Kontingent. */
export async function createUpload(
  userId: string,
  owner: MediaOwnerRef,
  data: { contentType: MediaContentType; sizeBytes: number; visibility: "PUBLIC" | "MEMBERS" },
  now: Date,
): Promise<RequestUploadResult> {
  const db = getDb();
  if ((await countQuota(owner, now)) >= MEDIA_QUOTA) return { ok: false, reason: "quota" };
  const { contentType, sizeBytes, visibility } = data;
  const last = await db.mediaAsset.findFirst({ where: { ...owner, deletedAt: null }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const media = await db.mediaAsset.create({
    data: {
      ownerUserId: userId,
      ...owner,
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
  return confirmUploadWhere(ownMediaWhere(userId, mediaId));
}

/** Bestätigung für ein Medium, das der Filter als eigenes ausweist (Profil oder Organisation). */
export async function confirmUploadWhere(where: Prisma.MediaAssetWhereInput): Promise<ConfirmUploadResult> {
  const db = getDb();
  const media = await db.mediaAsset.findFirst({ where: { ...where, status: "UPLOADING" }, select: { id: true, originalKey: true } });
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
