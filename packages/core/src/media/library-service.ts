import { getDb, type MediaStatus, type MediaVisibility } from "@app/db";
import { enqueue, mediaDeleteJob } from "@app/jobs";
import { ownMediaWhere, ownProfile } from "./owner";
import { MEDIA_QUOTA, bulkSchema, mediaIdSchema } from "./schemas";
import { requestSearchReindex } from "../search/reindex";

export interface OwnMedia {
  id: string;
  status: MediaStatus;
  visibility: MediaVisibility;
  sortOrder: number;
  isCover: boolean;
  altText: string | null;
  width: number | null;
  height: number | null;
  dominantColor: string | null;
  failureReason: string | null;
  moderationNote: string | null;
  createdAt: Date;
}

const OWN_SELECT = {
  id: true,
  status: true,
  visibility: true,
  sortOrder: true,
  isCover: true,
  altText: true,
  width: true,
  height: true,
  dominantColor: true,
  failureReason: true,
  moderationNote: true,
  createdAt: true,
} as const;

export interface OwnLibrary {
  media: OwnMedia[];
  quota: { used: number; max: number };
  /** Gab es je einen Upload? Ohne erscheint einmal der Hinweis zu EXIF und GPS (PRD v2 11.3). */
  hasUploadedBefore: boolean;
  canUpload: boolean;
}

/** Eigene Medien in ihrer Reihenfolge, ohne gelöschte und ohne nie bestätigte Uploads. Ohne Profil: null. */
export async function listOwnMedia(userId: string): Promise<OwnLibrary | null> {
  const profile = await ownProfile(userId);
  if (!profile) return null;
  const db = getDb();
  const [media, everUploaded] = await Promise.all([
    db.mediaAsset.findMany({
      where: { ownerUserId: userId, providerProfileId: profile.id, deletedAt: null, status: { not: "UPLOADING" } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: OWN_SELECT,
    }),
    db.mediaAsset.count({ where: { ownerUserId: userId }, take: 1 }),
  ]);
  const used = media.filter((entry) => entry.status !== "FAILED").length;
  return { media, quota: { used, max: MEDIA_QUOTA }, hasUploadedBefore: everUploaded > 0, canUpload: profile.canUpload };
}

/** Ein eigenes Medium; fremde, gelöschte und unbekannte IDs ergeben null. */
export async function getOwnMedia(userId: string, mediaId: string): Promise<OwnMedia | null> {
  if (!mediaIdSchema.safeParse(mediaId).success) return null;
  return getDb().mediaAsset.findFirst({ where: { ...ownMediaWhere(userId, mediaId), status: { not: "UPLOADING" } }, select: OWN_SELECT });
}

/** Status eigener Medien für die Anzeige nach dem Upload (Polling); unbekannte IDs fehlen in der Antwort. */
export async function ownMediaStatus(userId: string, mediaIds: readonly string[]): Promise<{ id: string; status: MediaStatus; failureReason: string | null }[]> {
  const ids = bulkSchema.parse({ mediaIds }).mediaIds;
  return getDb().mediaAsset.findMany({ where: { id: { in: ids }, ownerUserId: userId, deletedAt: null }, select: { id: true, status: true, failureReason: true } });
}

/**
 * Löscht eigene Medien (PRD v2 14.3, Schritt 5): markiert sie als gelöscht
 * (`deletedAt`) und legt pro Medium einen Job an, der Original und alle
 * Varianten entfernt. War ein Titelbild dabei, übernimmt das nächste Medium.
 */
export async function deleteOwnMedia(userId: string, mediaIds: string | readonly string[], now = new Date()): Promise<{ deleted: number }> {
  const ids = bulkSchema.parse({ mediaIds: typeof mediaIds === "string" ? [mediaIds] : mediaIds }).mediaIds;
  const db = getDb();
  const targets = await db.mediaAsset.findMany({
    where: { id: { in: ids }, ownerUserId: userId, deletedAt: null },
    select: { id: true, providerProfileId: true, originalKey: true, isCover: true, variants: { select: { key: true } } },
  });
  if (targets.length === 0) return { deleted: 0 };
  const deleted = await db.$transaction(async (tx) => {
    const done: typeof targets = [];
    for (const target of targets) {
      const { count } = await tx.mediaAsset.updateMany({ where: { id: target.id, deletedAt: null }, data: { deletedAt: now, isCover: false } });
      if (count > 0) done.push(target);
    }
    const profileIds = [...new Set(done.filter((entry) => entry.isCover && entry.providerProfileId).map((entry) => entry.providerProfileId as string))];
    for (const providerProfileId of profileIds) await ensureCover(tx, providerProfileId);
    return done;
  });
  for (const target of deleted) {
    await enqueue(mediaDeleteJob, { mediaId: target.id, originals: [target.originalKey], derivatives: target.variants.map((variant) => variant.key) });
  }
  for (const providerProfileId of new Set(deleted.flatMap((target) => (target.providerProfileId ? [target.providerProfileId] : [])))) {
    await requestSearchReindex(providerProfileId);
  }
  return { deleted: deleted.length };
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["$transaction"]>[0]>[0];

/** Genau ein Titelbild pro Profil, solange es Medien gibt: fehlt es, wird das erste nicht fehlgeschlagene Medium Titelbild. */
export async function ensureCover(tx: Tx, providerProfileId: string): Promise<void> {
  const current = await tx.mediaAsset.count({ where: { providerProfileId, deletedAt: null, isCover: true } });
  if (current > 0) return;
  const first = await tx.mediaAsset.findFirst({
    where: { providerProfileId, deletedAt: null, status: { notIn: ["FAILED", "UPLOADING"] } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (first) await tx.mediaAsset.update({ where: { id: first.id }, data: { isCover: true } });
}
