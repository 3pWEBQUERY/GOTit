import { getDb } from "@app/db";
import { adminAccess } from "../admin/policy";
import { loadAdminActor } from "../admin/service";
import { REVIEWER_ROLES } from "../verification/review-service";
import { mediaIdSchema } from "./schemas";
import { parseVariantName } from "./variants";

/**
 * Wie eine Variante ausgeliefert wird: `public` mit langem Cache, `private`
 * nur für diese Person ohne Cache. null heisst 404, ohne zu verraten, ob es
 * das Medium gibt (PRD 16.2).
 */
export type MediaDelivery = { access: "public" | "private"; key: string; format: "avif" | "webp" } | null;

/** Profile, deren freigegebene Medien öffentlich erreichbar sind (gesperrte und archivierte antworten mit 404). */
const VISIBLE_PROFILE = ["PUBLISHED", "PAUSED", "RESTRICTED"] as const;

/** Mitglied im Sinne von PRD v1 FR-MEDIA-004: angemeldet, aktiv und altersbestätigt. */
export async function isMediaMember(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const user = await getDb().user.findUnique({ where: { id: userId }, select: { ageConfirmedAt: true, deactivatedAt: true } });
  return Boolean(user?.ageConfirmedAt && !user.deactivatedAt);
}

async function loadVariant(mediaId: string, variant: string) {
  const parsed = parseVariantName(variant);
  if (!parsed || !mediaIdSchema.safeParse(mediaId).success) return null;
  const media = await getDb().mediaAsset.findUnique({
    where: { id: mediaId },
    select: {
      status: true,
      visibility: true,
      deletedAt: true,
      ownerUserId: true,
      providerProfile: { select: { status: true } },
      variants: { where: { name: variant }, select: { key: true } },
    },
  });
  const key = media?.variants[0]?.key;
  if (!media || media.deletedAt || !key) return null;
  return { media, key, format: parsed.format };
}

/** Auslieferung unter `/media/[id]/[variante]` (PRD v2 14.3, Schritt 4). */
export async function resolveMediaDelivery(mediaId: string, variant: string, viewerUserId: string | null): Promise<MediaDelivery> {
  const found = await loadVariant(mediaId, variant);
  if (!found) return null;
  const { media, key, format } = found;
  const profileVisible = (VISIBLE_PROFILE as readonly string[]).includes(media.providerProfile?.status ?? "");
  if (media.status === "PUBLISHED" && profileVisible) {
    if (media.visibility === "PUBLIC") return { access: "public", key, format };
    if (viewerUserId && (viewerUserId === media.ownerUserId || (await isMediaMember(viewerUserId)))) return { access: "private", key, format };
  }
  // Der Eigentümer sieht seine Medien in der Bibliothek in jedem Status ausser fehlgeschlagen und gelöscht.
  if (viewerUserId && viewerUserId === media.ownerUserId && media.status !== "FAILED") return { access: "private", key, format };
  return null;
}

/** Vorschau für die Moderation: nur Medien in Prüfung, nur mit Prüfrolle und zweitem Faktor. */
export async function resolveReviewPreview(mediaId: string, variant: string, actorId: string | null): Promise<MediaDelivery> {
  if (!actorId || !adminAccess(await loadAdminActor(actorId), REVIEWER_ROLES).allowed) return null;
  const found = await loadVariant(mediaId, variant);
  if (!found || found.media.status !== "IN_REVIEW") return null;
  return { access: "private", key: found.key, format: found.format };
}
