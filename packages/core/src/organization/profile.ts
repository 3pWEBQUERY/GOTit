import { getDb } from "@app/db";
import { authorize, membershipOf } from "./access";
import { organizationProfileSchema, verificationSchema } from "./schemas";

/**
 * Unternehmensprofil und Nachweise (v1 FR-BUSINESS-001, FR-VERIFY-003; v2 7.7
 * `/profil`, `/nachweise`). Öffentlich wird eine Organisation erst, wenn ihre
 * Geschäftsidentität geprüft und freigegeben ist (Status PUBLISHED).
 */
export async function getOwnOrganization(
  userId: string,
  organizationSlug: string,
) {
  const membership = await membershipOf(userId, organizationSlug);
  if (!membership) return null;
  const db = getDb();
  const [organization, verification] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: membership.organizationId },
      select: {
        id: true,
        slug: true,
        name: true,
        kind: true,
        status: true,
        description: true,
        website: true,
        phone: true,
        publicEmail: true,
        publishedAt: true,
      },
    }),
    db.organizationVerification.findFirst({
      where: { organizationId: membership.organizationId },
      orderBy: { submittedAt: "desc" },
      select: {
        status: true,
        legalName: true,
        uid: true,
        permitNote: true,
        reason: true,
        submittedAt: true,
        decidedAt: true,
      },
    }),
  ]);
  return { role: membership.role, organization, verification };
}

export type OrganizationWriteResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "forbidden" | "invalid" | "open" };

export async function saveOrganizationProfile(
  userId: string,
  organizationSlug: string,
  input: unknown,
): Promise<OrganizationWriteResult> {
  const membership = await authorize(userId, organizationSlug, "profile.edit");
  if (!membership)
    return {
      ok: false,
      reason: (await membershipOf(userId, organizationSlug))
        ? "forbidden"
        : "not-found",
    };
  const parsed = organizationProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  await getDb().organization.update({
    where: { id: membership.organizationId },
    data: parsed.data,
  });
  return { ok: true };
}

/**
 * Nachweise einreichen: Firmenname laut Handelsregister, UID, Bestätigung der
 * Berechtigung, Hinweis auf Bewilligungen. Eine neue Einreichung ersetzt eine
 * offene nicht; geänderte Angaben einer geprüften Organisation führen zu einer
 * neuen Prüfung, die Organisation bleibt bis zum Entscheid sichtbar
 * («Erneute Prüfung bei wesentlichen Änderungen»).
 */
export async function submitVerification(
  userId: string,
  organizationSlug: string,
  input: unknown,
): Promise<OrganizationWriteResult> {
  const membership = await authorize(
    userId,
    organizationSlug,
    "verification.submit",
  );
  if (!membership)
    return {
      ok: false,
      reason: (await membershipOf(userId, organizationSlug))
        ? "forbidden"
        : "not-found",
    };
  const parsed = verificationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const db = getDb();
  if (
    (await db.organizationVerification.count({
      where: { organizationId: membership.organizationId, status: "SUBMITTED" },
    })) > 0
  )
    return { ok: false, reason: "open" };
  const { authorityConfirmed, ...data } = parsed.data;
  await db.$transaction(async (tx) => {
    await tx.organizationVerification.create({
      data: {
        organizationId: membership.organizationId,
        authorityConfirmed,
        ...data,
      },
    });
    await tx.organization.updateMany({
      where: { id: membership.organizationId, status: { in: ["DRAFT"] } },
      data: { status: "SUBMITTED" },
    });
  });
  return { ok: true };
}
