import { getDb, type ConsentKind } from "@app/db";

/**
 * Stand der Rechtstexte, dem zugestimmt wird. Die Texte selbst (AGB,
 * Datenschutz) liefert die rechtliche Prüfung (Gate 16.3); bei jeder Änderung
 * wird die Version erhöht, damit nachvollziehbar bleibt, wer welchem Stand
 * zugestimmt hat.
 */
export const CONSENT_VERSIONS: Record<ConsentKind, string> = {
  TERMS: "2026-11-16",
  PRIVACY: "2026-11-16",
  AGE_CONFIRMATION: "2026-11-16",
  PROFILE_PUBLICATION: "2026-11-16",
};

/** Hält Einwilligungen fest (PRD v1 FR-AUTH-001, FR-VERIFY-002, ConsentRecord). */
export async function recordConsents(userId: string, kinds: readonly ConsentKind[], now = new Date()): Promise<void> {
  await getDb().consentRecord.createMany({
    data: kinds.map((kind) => ({ userId, kind, version: CONSENT_VERSIONS[kind], grantedAt: now })),
  });
}

/** Gültige (nicht widerrufene) Einwilligungen eines Kontos. */
export async function listOwnConsents(userId: string) {
  return getDb().consentRecord.findMany({
    where: { userId, withdrawnAt: null },
    orderBy: { grantedAt: "desc" },
    select: { kind: true, version: true, grantedAt: true },
  });
}
