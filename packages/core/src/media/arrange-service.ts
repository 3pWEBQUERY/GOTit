import { getDb } from "@app/db";
import { ownMediaWhere, ownProfile } from "./owner";
import { altTextSchema, bulkSchema, moveSchema, reorderSchema, visibilitySchema } from "./schemas";
import { requestSearchReindex, requestSearchReindexForUser } from "../search/reindex";

export type ArrangeResult = { ok: true } | { ok: false; reason: "not-found" | "invalid" | "edge" };

/** Eigene Medien in der Reihenfolge der Bibliothek (ohne gelöschte und nie bestätigte). */
async function ownOrder(userId: string, providerProfileId: string): Promise<string[]> {
  const rows = await getDb().mediaAsset.findMany({
    where: { ownerUserId: userId, providerProfileId, deletedAt: null, status: { not: "UPLOADING" } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

async function writeOrder(order: readonly string[]): Promise<void> {
  await getDb().$transaction(order.map((id, index) => getDb().mediaAsset.update({ where: { id }, data: { sortOrder: index } })));
}

/**
 * Neue Reihenfolge per Drag-and-drop. Die Liste muss genau die eigenen Medien
 * enthalten; eine fremde oder fehlende ID ändert nichts.
 */
export async function reorderOwnMedia(userId: string, input: unknown): Promise<ArrangeResult> {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const profile = await ownProfile(userId);
  if (!profile) return { ok: false, reason: "not-found" };
  const current = await ownOrder(userId, profile.id);
  const next = parsed.data.order;
  if (next.length !== current.length || new Set(next).size !== next.length || next.some((id) => !current.includes(id))) return { ok: false, reason: "invalid" };
  await writeOrder(next);
  await requestSearchReindex(profile.id);
  return { ok: true };
}

/** «Nach vorne» und «Nach hinten» (PRD v2 11.3): tauscht mit dem Nachbarn. */
export async function moveOwnMedia(userId: string, mediaId: string, input: unknown): Promise<ArrangeResult> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const profile = await ownProfile(userId);
  if (!profile) return { ok: false, reason: "not-found" };
  const order = await ownOrder(userId, profile.id);
  const index = order.indexOf(mediaId);
  if (index < 0) return { ok: false, reason: "not-found" };
  const target = parsed.data.direction === "forward" ? index - 1 : index + 1;
  if (target < 0 || target >= order.length) return { ok: false, reason: "edge" };
  [order[index], order[target]] = [order[target] as string, order[index] as string];
  await writeOrder(order);
  await requestSearchReindex(profile.id);
  return { ok: true };
}

/** Titelbild festlegen: genau eines pro Profil. Fehlgeschlagene Medien kommen nicht in Frage. */
export async function setCoverMedia(userId: string, mediaId: string): Promise<ArrangeResult> {
  const db = getDb();
  const media = await db.mediaAsset.findFirst({ where: { ...ownMediaWhere(userId, mediaId), status: { notIn: ["FAILED", "UPLOADING"] } }, select: { id: true, providerProfileId: true } });
  if (!media?.providerProfileId) return { ok: false, reason: "not-found" };
  const providerProfileId = media.providerProfileId;
  await db.$transaction([
    db.mediaAsset.updateMany({ where: { providerProfileId, isCover: true, id: { not: media.id } }, data: { isCover: false } }),
    db.mediaAsset.update({ where: { id: media.id }, data: { isCover: true } }),
  ]);
  await requestSearchReindex(providerProfileId);
  return { ok: true };
}

/** Sichtbarkeit eines oder mehrerer eigener Medien. Fremde IDs werden übergangen. */
export async function setOwnMediaVisibility(userId: string, mediaIds: string | readonly string[], input: unknown): Promise<{ updated: number }> {
  const ids = bulkSchema.parse({ mediaIds: typeof mediaIds === "string" ? [mediaIds] : mediaIds }).mediaIds;
  const { visibility } = visibilitySchema.parse(input);
  const { count } = await getDb().mediaAsset.updateMany({ where: { id: { in: ids }, ownerUserId: userId, deletedAt: null }, data: { visibility } });
  if (count > 0) await requestSearchReindexForUser(userId);
  return { updated: count };
}

/** Alternativtext (PRD v2 10.1); leer heisst: neutraler Text. */
export async function setOwnMediaAltText(userId: string, mediaId: string, input: unknown): Promise<ArrangeResult> {
  const parsed = altTextSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { count } = await getDb().mediaAsset.updateMany({ where: ownMediaWhere(userId, mediaId), data: { altText: parsed.data.altText || null } });
  if (count > 0) await requestSearchReindexForUser(userId);
  return count > 0 ? { ok: true } : { ok: false, reason: "not-found" };
}

