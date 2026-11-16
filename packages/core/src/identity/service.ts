import { getDb } from "@app/db";
import type { AccountViewer } from "./types";

/** Lädt die Rollen eines Kontos. Liefert null, wenn das Konto nicht (mehr) existiert. */
export async function loadAccountViewer(userId: string): Promise<AccountViewer | null> {
  const user = await getDb().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      ageConfirmedAt: true,
      providerProfile: { select: { slug: true, displayName: true, status: true } },
      organizationMembers: {
        select: { role: true, organization: { select: { slug: true, name: true, status: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) return null;
  return {
    kind: "account",
    userId: user.id,
    name: user.name,
    ageConfirmed: user.ageConfirmedAt !== null,
    provider: user.providerProfile,
    organizations: user.organizationMembers
      .filter((membership) => membership.organization.status !== "ARCHIVED")
      .map((membership) => ({
        slug: membership.organization.slug,
        name: membership.organization.name,
        role: membership.role,
      })),
  };
}

export async function confirmAccountAge(userId: string, now = new Date()): Promise<void> {
  await getDb().user.updateMany({ where: { id: userId, ageConfirmedAt: null }, data: { ageConfirmedAt: now } });
}
