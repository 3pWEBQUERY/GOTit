import type { IdentityCheckStatus, ProviderStatus, ReviewDecision } from "@app/db";

export interface IdentityCheckFacts {
  status: IdentityCheckStatus;
  ageOver18: boolean | null;
  livenessPassed: boolean | null;
  expiresAt: Date | null;
}

/**
 * Gilt die Identitätsprüfung? Verlangt Volljährigkeit, Lebendigkeitsprüfung
 * und ein Ablaufdatum in der Zukunft (PRD 16.1). Fehlt ein Teil, gilt sie nicht.
 */
export function isIdentityValid(check: IdentityCheckFacts | null, now = new Date()): boolean {
  if (!check || check.status !== "APPROVED") return false;
  if (check.ageOver18 !== true || check.livenessPassed !== true) return false;
  return check.expiresAt !== null && check.expiresAt.getTime() > now.getTime();
}

export interface PublicationFacts {
  profileStatus: ProviderStatus;
  identity: IdentityCheckFacts | null;
  /** Entscheid der letzten manuellen Prüfung. */
  latestReview: ReviewDecision | null;
}

/**
 * Ist das Profil öffentlich sichtbar? Nur wenn es freigegeben ist, die letzte
 * manuelle Prüfung «freigegeben» lautet und die Identitätsprüfung jetzt gilt.
 * Läuft die Identitätsprüfung ab, verschwindet das Profil, ohne dass jemand
 * den Status ändern muss. Pausierte Profile sind erreichbar, aber ohne
 * Kontakt (PRD 10.1); das regelt die Profilseite, nicht diese Funktion.
 */
export function isPubliclyVisible(facts: PublicationFacts, now = new Date()): boolean {
  return facts.profileStatus === "PUBLISHED" && facts.latestReview === "APPROVED" && isIdentityValid(facts.identity, now);
}

/** Darf ein Profil eingereicht werden? Nur aus Entwurf oder Korrektur und nur mit gültiger Identitätsprüfung. */
export function canSubmit(status: ProviderStatus, identity: IdentityCheckFacts | null, missingSteps: readonly string[], now = new Date()): boolean {
  return (status === "DRAFT" || status === "CHANGES_REQUESTED") && isIdentityValid(identity, now) && missingSteps.length === 0;
}

/** Darf die Prüfung freigeben? Nur eingereichte Profile, nur mit gültiger Identitätsprüfung. */
export function canApprove(status: ProviderStatus, identity: IdentityCheckFacts | null, now = new Date()): boolean {
  return status === "SUBMITTED" && isIdentityValid(identity, now);
}
