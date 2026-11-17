import { getDb, Prisma } from "@app/db";
import { parsePendingChanges } from "./change-policy";
import { lockProfile } from "./save-section";

export interface ChangeDecision {
  decision: "APPROVED" | "REJECTED";
  reason: string;
  rule: string;
}

/**
 * Entscheid über einen Prüffall `CHANGE` (PRD v2 11.2). Freigeben übernimmt
 * `pendingChanges` atomar, Ablehnen verwirft sie; beides mit Begründung und
 * Audit-Eintrag. Der Status des Profils bleibt, wie er ist: Eine abgelehnte
 * Änderung sperrt kein Profil. Die Rolle prüft der Aufrufer (`decideReview`).
 */
export async function decideChangeReview(actorId: string, reviewId: string, profileId: string, input: ChangeDecision, now = new Date()): Promise<boolean> {
  return getDb().$transaction(async (tx) => {
    // Dieselbe Sperre wie beim Speichern: Der Anbieter kann die wartende Änderung nicht mitten im Entscheid ersetzen.
    await lockProfile(tx, { id: profileId });
    const { count } = await tx.profileReview.updateMany({
      where: { id: reviewId, kind: "CHANGE", decision: null },
      data: { decision: input.decision, decidedAt: now, decidedById: actorId, reason: input.reason, rule: input.rule },
    });
    if (count === 0) return false;
    const profile = await tx.providerProfile.findUniqueOrThrow({ where: { id: profileId }, select: { pendingChanges: true } });
    const pending = parsePendingChanges(profile.pendingChanges);
    if (input.decision === "APPROVED") {
      const { regionIds, ...fields } = pending;
      await tx.providerProfile.update({ where: { id: profileId }, data: { ...fields, pendingChanges: Prisma.DbNull, contentUpdatedAt: now } });
      if (regionIds) {
        const approved = await tx.region.findMany({ where: { id: { in: regionIds }, approved: true }, select: { id: true } });
        // Eine inzwischen nicht mehr freigegebene Region fällt weg; ohne gültige Region bleiben die bisherigen.
        if (approved.length > 0) {
          await tx.providerRegion.deleteMany({ where: { providerProfileId: profileId } });
          await tx.providerRegion.createMany({ data: approved.map((region) => ({ providerProfileId: profileId, regionId: region.id })) });
        }
      }
    } else {
      await tx.providerProfile.update({ where: { id: profileId }, data: { pendingChanges: Prisma.DbNull } });
    }
    await tx.auditEvent.create({
      data: { actorId, action: `profile_change.${input.decision.toLowerCase()}`, target: `profile_review:${reviewId}`, reason: `${input.rule}: ${input.reason}` },
    });
    return true;
  });
}
