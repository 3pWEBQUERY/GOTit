import { getDb } from "@app/db";
import { authorize, membershipOf } from "../organization/access";
import { hasPermission } from "../organization/permissions";
import {
  orderOf,
  sameMembers,
  swapped,
  writeOrder,
  type ArrangeResult,
} from "./arrange-service";
import {
  OWN_SELECT,
  deleteMediaWhere,
  type OwnLibrary,
  type OwnMedia,
} from "./library-service";
import {
  MEDIA_QUOTA,
  altTextSchema,
  bulkSchema,
  mediaIdSchema,
  moveSchema,
  reorderSchema,
} from "./schemas";
import {
  confirmUploadWhere,
  createUpload,
  parseUploadInput,
  type ConfirmUploadResult,
  type RequestUploadResult,
} from "./upload-service";

/**
 * Medien einer Organisation: Logo, Titelbild und Galerie (v1 FR-BUSINESS-001,
 * Entscheid 0018). Sie gehören der Organisation, nicht der Person, die sie
 * hochgeladen hat: Jedes Mitglied mit «media.edit» verwaltet alle Medien der
 * Organisation, Mitglieder ohne dieses Recht sehen sie nur. Medien einer
 * anderen Organisation verhalten sich wie unbekannte. Medien einer
 * Organisation sind immer öffentlich (keine Sichtbarkeit «Nur Mitglieder»),
 * gehen wie alle Medien durch die Moderation und erscheinen erst danach auf
 * `/c/[slug]`.
 */
async function editor(
  userId: string,
  organizationSlug: string,
): Promise<{ organizationId: string; canUpload: boolean } | null> {
  const membership = await authorize(userId, organizationSlug, "media.edit");
  if (!membership) return null;
  const [organization, user] = await Promise.all([
    getDb().organization.findUniqueOrThrow({
      where: { id: membership.organizationId },
      select: { status: true },
    }),
    getDb().user.findUnique({
      where: { id: userId },
      select: { deactivatedAt: true },
    }),
  ]);
  if (!user || user.deactivatedAt) return null;
  return {
    organizationId: membership.organizationId,
    canUpload: organization.status !== "SUSPENDED",
  };
}

function ownWhere(organizationId: string, mediaId: string) {
  return { id: mediaId, organizationId, deletedAt: null } as const;
}

export interface OrganizationLibrary extends OwnLibrary {
  /** Darf die Person Medien hochladen, ordnen und löschen («media.edit»)? */
  canEdit: boolean;
}

/** Bibliothek der Organisation für jedes Mitglied; fremde und unbekannte Organisationen: null. */
export async function listOrganizationMedia(
  userId: string,
  organizationSlug: string,
): Promise<OrganizationLibrary | null> {
  const membership = await membershipOf(userId, organizationSlug);
  if (!membership) return null;
  const organizationId = membership.organizationId;
  const db = getDb();
  const [media, everUploaded, access] = await Promise.all([
    db.mediaAsset.findMany({
      where: { organizationId, deletedAt: null, status: { not: "UPLOADING" } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: OWN_SELECT,
    }),
    db.mediaAsset.count({ where: { organizationId }, take: 1 }),
    editor(userId, organizationSlug),
  ]);
  const used = media.filter((entry) => entry.status !== "FAILED").length;
  return {
    media,
    quota: { used, max: MEDIA_QUOTA },
    hasUploadedBefore: everUploaded > 0,
    canUpload: access?.canUpload ?? false,
    canEdit: access !== null && hasPermission(membership.role, "media.edit"),
  };
}

/** Ein Medium der Organisation für jedes Mitglied; fremde, gelöschte und unbekannte: null. */
export async function getOrganizationMedia(
  userId: string,
  organizationSlug: string,
  mediaId: string,
): Promise<OwnMedia | null> {
  if (!mediaIdSchema.safeParse(mediaId).success) return null;
  const membership = await membershipOf(userId, organizationSlug);
  if (!membership) return null;
  return getDb().mediaAsset.findFirst({
    where: {
      ...ownWhere(membership.organizationId, mediaId),
      status: { not: "UPLOADING" },
    },
    select: OWN_SELECT,
  });
}

/** Schritt 1 des Uploads für die Organisation; Sichtbarkeit immer öffentlich. */
export async function requestOrganizationUpload(
  userId: string,
  organizationSlug: string,
  input: unknown,
  now = new Date(),
): Promise<RequestUploadResult> {
  const parsed = parseUploadInput(input);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const access = await editor(userId, organizationSlug);
  if (!access?.canUpload) return { ok: false, reason: "not-allowed" };
  return createUpload(
    userId,
    { organizationId: access.organizationId },
    { ...parsed.data, visibility: "PUBLIC" },
    now,
  );
}

/** Schritt 2: nur die Person, die den Upload angemeldet hat, und nur mit «media.edit». */
export async function confirmOrganizationUpload(
  userId: string,
  organizationSlug: string,
  mediaId: string,
): Promise<ConfirmUploadResult> {
  const access = await editor(userId, organizationSlug);
  if (!access || !mediaIdSchema.safeParse(mediaId).success)
    return { ok: false, reason: "not-found" };
  return confirmUploadWhere({
    ...ownWhere(access.organizationId, mediaId),
    ownerUserId: userId,
  });
}

export async function deleteOrganizationMedia(
  userId: string,
  organizationSlug: string,
  mediaIds: string | readonly string[],
  now = new Date(),
): Promise<{ deleted: number }> {
  const ids = bulkSchema.parse({
    mediaIds: typeof mediaIds === "string" ? [mediaIds] : mediaIds,
  }).mediaIds;
  const access = await editor(userId, organizationSlug);
  if (!access) return { deleted: 0 };
  return deleteMediaWhere(
    { id: { in: ids }, organizationId: access.organizationId, deletedAt: null },
    now,
  );
}

export async function reorderOrganizationMedia(
  userId: string,
  organizationSlug: string,
  input: unknown,
): Promise<ArrangeResult> {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const access = await editor(userId, organizationSlug);
  if (!access) return { ok: false, reason: "not-found" };
  const current = await orderOf({ organizationId: access.organizationId });
  if (!sameMembers(current, parsed.data.order))
    return { ok: false, reason: "invalid" };
  await writeOrder(parsed.data.order);
  return { ok: true };
}

export async function moveOrganizationMedia(
  userId: string,
  organizationSlug: string,
  mediaId: string,
  input: unknown,
): Promise<ArrangeResult> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const access = await editor(userId, organizationSlug);
  if (!access) return { ok: false, reason: "not-found" };
  const order = swapped(
    await orderOf({ organizationId: access.organizationId }),
    mediaId,
    parsed.data.direction,
  );
  if (order === null) return { ok: false, reason: "not-found" };
  if (order === "edge") return { ok: false, reason: "edge" };
  await writeOrder(order);
  return { ok: true };
}

/**
 * Titelbild oder Logo festlegen: je genau eines pro Organisation, und ein Bild
 * ist nie beides zugleich. Fehlgeschlagene Medien kommen nicht in Frage.
 */
async function setRole(
  userId: string,
  organizationSlug: string,
  mediaId: string,
  role: "cover" | "logo",
): Promise<ArrangeResult> {
  const access = await editor(userId, organizationSlug);
  if (!access || !mediaIdSchema.safeParse(mediaId).success)
    return { ok: false, reason: "not-found" };
  const db = getDb();
  const media = await db.mediaAsset.findFirst({
    where: {
      ...ownWhere(access.organizationId, mediaId),
      status: { notIn: ["FAILED", "UPLOADING"] },
    },
    select: { id: true },
  });
  if (!media) return { ok: false, reason: "not-found" };
  const flag = role === "cover" ? "isCover" : "isLogo";
  await db.$transaction([
    db.mediaAsset.updateMany({
      where: {
        organizationId: access.organizationId,
        [flag]: true,
        id: { not: media.id },
      },
      data: { [flag]: false },
    }),
    db.mediaAsset.update({
      where: { id: media.id },
      data:
        role === "cover"
          ? { isCover: true, isLogo: false }
          : { isLogo: true, isCover: false },
    }),
  ]);
  return { ok: true };
}

export async function setOrganizationCover(
  userId: string,
  organizationSlug: string,
  mediaId: string,
): Promise<ArrangeResult> {
  return setRole(userId, organizationSlug, mediaId, "cover");
}

export async function setOrganizationLogo(
  userId: string,
  organizationSlug: string,
  mediaId: string,
): Promise<ArrangeResult> {
  return setRole(userId, organizationSlug, mediaId, "logo");
}

export async function setOrganizationMediaAltText(
  userId: string,
  organizationSlug: string,
  mediaId: string,
  input: unknown,
): Promise<ArrangeResult> {
  const parsed = altTextSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const access = await editor(userId, organizationSlug);
  if (!access || !mediaIdSchema.safeParse(mediaId).success)
    return { ok: false, reason: "not-found" };
  const { count } = await getDb().mediaAsset.updateMany({
    where: ownWhere(access.organizationId, mediaId),
    data: { altText: parsed.data.altText || null },
  });
  return count > 0 ? { ok: true } : { ok: false, reason: "not-found" };
}
