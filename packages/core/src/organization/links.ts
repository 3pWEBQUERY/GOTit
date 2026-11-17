import { getDb, type OrganizationLinkStatus } from "@app/db";
import { pickLocalizedName, type Locale } from "../locale";
import { authorize, membershipOf } from "./access";
import { inviteSchema } from "./schemas";

/**
 * Verknüpfungen mit Anbietern (v1 FR-BUSINESS-003/005, v2 12.2, Abnahme 1.11).
 * - Die Organisation lädt ein; aktiv wird die Verknüpfung erst mit der
 *   Zustimmung des Anbieters.
 * - Beide Seiten können lösen; das Anbieterkonto bleibt immer bestehen.
 * - Die Organisation sieht ausschliesslich öffentliche Profilangaben
 *   (Anzeigename, Slug, Region, Status der Verknüpfung). Keine Funktion hier
 *   liest Nachrichten, Ausweisdaten, Kalender, E-Mail oder Konto-ID.
 */
export type InviteResult =
  | { ok: true; linkId: string }
  | {
      ok: false;
      reason:
        | "not-found"
        | "forbidden"
        | "invalid"
        | "provider-unavailable"
        | "already-linked";
    };

export async function inviteProvider(
  userId: string,
  organizationSlug: string,
  input: unknown,
): Promise<InviteResult> {
  const membership = await authorize(
    userId,
    organizationSlug,
    "providers.invite",
  );
  if (!membership)
    return {
      ok: false,
      reason: (await membershipOf(userId, organizationSlug))
        ? "forbidden"
        : "not-found",
    };
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db = getDb();
  const provider = await db.providerProfile.findUnique({
    where: { slug: parsed.data.providerSlug },
    select: { id: true, status: true },
  });
  if (!provider || !["PUBLISHED", "PAUSED"].includes(provider.status))
    return { ok: false, reason: "provider-unavailable" };
  if (
    parsed.data.locationId &&
    (await db.location.count({
      where: {
        id: parsed.data.locationId,
        organizationId: membership.organizationId,
      },
    })) === 0
  )
    return { ok: false, reason: "invalid" };
  const open = await db.organizationLink.count({
    where: {
      organizationId: membership.organizationId,
      providerProfileId: provider.id,
      status: { in: ["INVITED", "ACTIVE"] },
    },
  });
  if (open > 0) return { ok: false, reason: "already-linked" };
  const link = await db.organizationLink.create({
    data: {
      organizationId: membership.organizationId,
      providerProfileId: provider.id,
      locationId: parsed.data.locationId,
      invitedById: userId,
      message: parsed.data.message,
    },
    select: { id: true },
  });
  return { ok: true, linkId: link.id };
}

export interface LinkedProviderRow {
  linkId: string;
  status: OrganizationLinkStatus;
  displayName: string;
  slug: string;
  regionName: string | null;
  locationName: string | null;
  invitedAt: Date;
  respondedAt: Date | null;
}

/** Tabelle «Anbieter» der Organisation: nur öffentliche Angaben (v2 12.2). */
export async function listOrganizationProviders(
  userId: string,
  organizationSlug: string,
  locale: Locale,
): Promise<LinkedProviderRow[] | null> {
  const membership = await membershipOf(userId, organizationSlug);
  if (!membership) return null;
  const rows = await getDb().organizationLink.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { invitedAt: "desc" },
    select: {
      id: true,
      status: true,
      invitedAt: true,
      respondedAt: true,
      location: { select: { name: true } },
      providerProfile: {
        select: {
          displayName: true,
          slug: true,
          regions: {
            where: { region: { approved: true } },
            take: 1,
            select: {
              region: {
                select: {
                  nameDe: true,
                  nameFr: true,
                  nameIt: true,
                  nameEn: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return rows.map((row) => ({
    linkId: row.id,
    status: row.status,
    displayName: row.providerProfile.displayName,
    slug: row.providerProfile.slug,
    regionName: row.providerProfile.regions[0]
      ? pickLocalizedName(row.providerProfile.regions[0].region, locale)
      : null,
    locationName: row.location?.name ?? null,
    invitedAt: row.invitedAt,
    respondedAt: row.respondedAt,
  }));
}

/** Anbieterseite: eigene Einladungen und Verknüpfungen (`/studio/verknuepfungen`). */
export async function listOwnOrganizationLinks(userId: string) {
  return getDb().organizationLink.findMany({
    where: {
      providerProfile: { userId },
      status: { in: ["INVITED", "ACTIVE"] },
    },
    orderBy: { invitedAt: "desc" },
    select: {
      id: true,
      status: true,
      message: true,
      invitedAt: true,
      respondedAt: true,
      location: { select: { name: true } },
      organization: {
        select: { slug: true, name: true, kind: true, status: true },
      },
    },
  });
}

export async function respondToInvitation(
  userId: string,
  linkId: string,
  accept: boolean,
  now = new Date(),
): Promise<boolean> {
  if (linkId.length > 64) return false;
  const { count } = await getDb().organizationLink.updateMany({
    where: { id: linkId, status: "INVITED", providerProfile: { userId } },
    data: { status: accept ? "ACTIVE" : "DECLINED", respondedAt: now },
  });
  return count > 0;
}

/** Lösen: der Anbieter jederzeit, die Organisation mit der Berechtigung «providers.end». */
export async function endLink(
  userId: string,
  linkId: string,
  now = new Date(),
): Promise<boolean> {
  if (linkId.length > 64) return false;
  const db = getDb();
  const link = await db.organizationLink.findUnique({
    where: { id: linkId },
    select: {
      status: true,
      providerProfile: { select: { userId: true } },
      organization: { select: { slug: true } },
    },
  });
  if (!link || !["INVITED", "ACTIVE"].includes(link.status)) return false;
  const isProvider = link.providerProfile.userId === userId;
  if (
    !isProvider &&
    !(await authorize(userId, link.organization.slug, "providers.end"))
  )
    return false;
  const { count } = await db.organizationLink.updateMany({
    where: { id: linkId, status: link.status },
    data: {
      status: "ENDED",
      endedAt: now,
      endedBy: isProvider ? "PROVIDER" : "ORGANIZATION",
    },
  });
  return count > 0;
}
