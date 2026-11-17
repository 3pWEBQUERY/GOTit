import { getDb, type OrganizationRole } from "@app/db";
import { hasPermission, type OrganizationPermission } from "./permissions";

export interface Membership {
  organizationId: string;
  slug: string;
  role: OrganizationRole;
}

const SLUG = /^[a-z0-9-]{1,80}$/;

/** Mitgliedschaft eines Kontos in einer Organisation; fremde oder archivierte wie unbekannt. */
export async function membershipOf(
  userId: string,
  organizationSlug: string,
): Promise<Membership | null> {
  if (!SLUG.test(organizationSlug)) return null;
  const row = await getDb().organizationMember.findFirst({
    where: {
      userId,
      organization: { slug: organizationSlug, status: { not: "ARCHIVED" } },
    },
    select: { role: true, organization: { select: { id: true, slug: true } } },
  });
  return row
    ? {
        organizationId: row.organization.id,
        slug: row.organization.slug,
        role: row.role,
      }
    : null;
}

/** Mitgliedschaft mit der verlangten Berechtigung, sonst null. */
export async function authorize(
  userId: string,
  organizationSlug: string,
  permission: OrganizationPermission,
): Promise<Membership | null> {
  const membership = await membershipOf(userId, organizationSlug);
  return membership && hasPermission(membership.role, permission)
    ? membership
    : null;
}
