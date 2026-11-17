import { getDb } from "@app/db";
import { z } from "zod";
import { assertModerator } from "../moderation/access";

/**
 * Prüfung der Geschäftsidentität durch die Plattform (v1 FR-VERIFY-003
 * «Dokumentierte Freigabe»). Atomar aus SUBMITTED, mit Begründung im Audit-Log.
 * Freigeben veröffentlicht die Organisation; zur Korrektur führt zurück in den
 * Entwurf, solange sie nie veröffentlicht war; Ablehnen sperrt sie.
 */
const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
  reason: z.string().trim().min(10).max(1000),
});

export async function listOrganizationVerifications(actorId: string) {
  await assertModerator(actorId);
  return getDb().organizationVerification.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { submittedAt: "asc" },
    take: 100,
    select: {
      id: true,
      submittedAt: true,
      legalName: true,
      uid: true,
      organization: {
        select: { slug: true, name: true, kind: true, status: true },
      },
    },
  });
}

export async function getOrganizationVerification(actorId: string, id: string) {
  await assertModerator(actorId);
  if (id.length > 64) return null;
  return getDb().organizationVerification.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      legalName: true,
      uid: true,
      authorityConfirmed: true,
      permitNote: true,
      reason: true,
      submittedAt: true,
      decidedAt: true,
      organization: {
        select: {
          slug: true,
          name: true,
          kind: true,
          status: true,
          description: true,
          website: true,
        },
      },
    },
  });
}

export async function decideOrganizationVerification(
  actorId: string,
  id: string,
  input: unknown,
  now = new Date(),
): Promise<{ ok: true } | { ok: false; reason: "invalid" | "not-open" }> {
  await assertModerator(actorId);
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success || id.length > 64)
    return { ok: false, reason: "invalid" };
  const { decision, reason } = parsed.data;
  const done = await getDb().$transaction(async (tx) => {
    const { count } = await tx.organizationVerification.updateMany({
      where: { id, status: "SUBMITTED" },
      data: { status: decision, reason, decidedById: actorId, decidedAt: now },
    });
    if (count === 0) return false;
    const verification = await tx.organizationVerification.findUniqueOrThrow({
      where: { id },
      select: {
        organizationId: true,
        organization: { select: { publishedAt: true } },
      },
    });
    const organizationId = verification.organizationId;
    if (decision === "APPROVED")
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          status: "PUBLISHED",
          publishedAt: verification.organization.publishedAt ?? now,
        },
      });
    if (decision === "REJECTED")
      await tx.organization.update({
        where: { id: organizationId },
        data: { status: "SUSPENDED" },
      });
    if (decision === "CHANGES_REQUESTED")
      await tx.organization.updateMany({
        where: { id: organizationId, status: "SUBMITTED" },
        data: { status: "DRAFT" },
      });
    await tx.auditEvent.create({
      data: {
        actorId,
        action: `organization_verification.${decision.toLowerCase()}`,
        target: `organization_verification:${id}`,
        reason,
      },
    });
    return true;
  });
  return done ? { ok: true } : { ok: false, reason: "not-open" };
}
