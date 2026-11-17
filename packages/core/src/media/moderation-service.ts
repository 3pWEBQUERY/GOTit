import { getDb } from "@app/db";
import { adminAccess } from "../admin/policy";
import { loadAdminActor } from "../admin/service";
import { REVIEWER_ROLES } from "../verification/review-service";
import { mediaDecisionSchema, mediaIdSchema } from "./schemas";

/** Höchstzahl Medien pro Abruf der Warteschlange. */
export const MEDIA_QUEUE_LIMIT = 200;

/** Autorisierung im Kern (PRD 4.2): nur Prüfrollen mit zweitem Faktor. */
async function assertReviewer(actorId: string): Promise<void> {
  const access = adminAccess(await loadAdminActor(actorId), REVIEWER_ROLES);
  if (!access.allowed) throw new Error(`forbidden:${access.reason}`);
}

export interface MediaQueueEntry {
  id: string;
  submittedAt: Date;
  visibility: "PUBLIC" | "MEMBERS";
  displayName: string | null;
}

/** Medien in Prüfung, älteste zuerst (PRD v2 14.3, Schritt 3). */
export async function listMediaQueue(actorId: string): Promise<MediaQueueEntry[]> {
  await assertReviewer(actorId);
  const rows = await getDb().mediaAsset.findMany({
    where: { status: "IN_REVIEW", deletedAt: null },
    orderBy: { updatedAt: "asc" },
    take: MEDIA_QUEUE_LIMIT,
    select: { id: true, updatedAt: true, visibility: true, providerProfile: { select: { displayName: true } } },
  });
  return rows.map((row) => ({ id: row.id, submittedAt: row.updatedAt, visibility: row.visibility, displayName: row.providerProfile?.displayName ?? null }));
}

export async function countMediaQueue(actorId: string): Promise<number> {
  await assertReviewer(actorId);
  return getDb().mediaAsset.count({ where: { status: "IN_REVIEW", deletedAt: null } });
}

/** Ein Medium für den Einzelfall; null für unbekannte und gelöschte IDs. */
export async function getMediaCase(actorId: string, mediaId: string) {
  await assertReviewer(actorId);
  if (!mediaIdSchema.safeParse(mediaId).success) return null;
  return getDb().mediaAsset.findFirst({
    where: { id: mediaId, deletedAt: null, status: { notIn: ["UPLOADING", "PROCESSING", "FAILED"] } },
    select: {
      id: true,
      status: true,
      visibility: true,
      altText: true,
      width: true,
      height: true,
      dominantColor: true,
      moderationNote: true,
      updatedAt: true,
      createdAt: true,
      providerProfile: { select: { id: true, displayName: true, slug: true, status: true } },
    },
  });
}

/** Ältestes Medium in Prüfung ausser dem genannten, für «Nächster Fall». */
export async function nextMediaInReview(actorId: string, exceptId?: string): Promise<string | null> {
  await assertReviewer(actorId);
  const next = await getDb().mediaAsset.findFirst({
    where: { status: "IN_REVIEW", deletedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
    orderBy: { updatedAt: "asc" },
    select: { id: true },
  });
  return next?.id ?? null;
}

export type DecideMediaResult = { ok: true } | { ok: false; reason: "not-open" };

/**
 * Entscheid der Moderation über ein Medium: Freigeben, zur Korrektur oder
 * sperren. Atomar nur aus IN_REVIEW, damit zwei gleichzeitige Entscheide genau
 * einen Gewinner haben; jeder Entscheid landet mit Begründung im Audit-Log.
 */
export async function decideMedia(actorId: string, mediaId: string, input: unknown): Promise<DecideMediaResult> {
  const data = mediaDecisionSchema.parse(input);
  await assertReviewer(actorId);
  if (!mediaIdSchema.safeParse(mediaId).success) return { ok: false, reason: "not-open" };
  const decided = await getDb().$transaction(async (tx) => {
    const { count } = await tx.mediaAsset.updateMany({
      where: { id: mediaId, status: "IN_REVIEW", deletedAt: null },
      data: { status: data.decision, moderationNote: data.decision === "PUBLISHED" ? null : data.reason },
    });
    if (count === 0) return false;
    await tx.auditEvent.create({
      data: { actorId, action: `media.${data.decision.toLowerCase()}`, target: `media:${mediaId}`, reason: data.rule ? `${data.rule}: ${data.reason}` : data.reason },
    });
    return true;
  });
  return decided ? { ok: true } : { ok: false, reason: "not-open" };
}
