import type { ProfileAudience, ProviderStatus, ReviewDecision } from "@app/db";
import type { Viewer } from "../identity/types";
import { isPubliclyVisible, type IdentityCheckFacts } from "../verification/policy";

/**
 * Was die Profilseite einem Betrachter zeigt (PRD v2 10.1, Entscheid 0012):
 * - `ready`: öffentlich laut `isPubliclyVisible`; eingeschränkte Profile ebenso, aber ohne Kontakt.
 * - `paused`: pausiert und vorher freigegeben; erreichbar, ohne Kontakt.
 * - `members-only`: nur für Mitglieder, der Betrachter ist nicht angemeldet.
 * - `null`: 404. Gesperrt, archiviert, nie freigegeben oder Identität abgelaufen.
 *
 * Pausiert und eingeschränkt gehen durch dieselbe Regel wie veröffentlicht:
 * Nur der Status wird für die Prüfung als «veröffentlicht» gelesen, Prüfentscheid
 * und Identität müssen weiterhin gelten.
 */
export type PublicState = "ready" | "paused" | "members-only";

export interface PublicStateFacts {
  status: ProviderStatus;
  visibility: ProfileAudience;
  identity: IdentityCheckFacts | null;
  /** Entscheid der letzten Erstprüfung (kind PROFILE). Änderungsprüfungen zählen nicht. */
  latestProfileReview: ReviewDecision | null;
}

const REACHABLE: readonly ProviderStatus[] = ["PUBLISHED", "PAUSED", "RESTRICTED"];

/** Wäre das Profil ohne Rücksicht auf den Betrachter erreichbar? */
export function isReachable(facts: PublicStateFacts, now = new Date()): boolean {
  if (!REACHABLE.includes(facts.status)) return false;
  return isPubliclyVisible({ profileStatus: "PUBLISHED", identity: facts.identity, latestReview: facts.latestProfileReview }, now);
}

export function publicState(facts: PublicStateFacts, viewer: Viewer, now = new Date()): PublicState | null {
  if (!isReachable(facts, now)) return null;
  if (facts.visibility === "MEMBERS" && viewer.kind !== "account") return "members-only";
  return facts.status === "PAUSED" ? "paused" : "ready";
}

export interface ContactOptions {
  /** Kontakt ist grundsätzlich möglich (nicht pausiert, nicht eingeschränkt). */
  available: boolean;
  messages: boolean;
  bookingRequests: boolean;
  /** Durch die Moderation eingeschränkt (PRD v1 FR-PROFILE-005). */
  restricted: boolean;
}

export function contactOptions(status: ProviderStatus, allowMessages: boolean, allowBookingRequests: boolean): ContactOptions {
  const available = status === "PUBLISHED";
  return {
    available,
    messages: available && allowMessages,
    bookingRequests: available && allowBookingRequests,
    restricted: status === "RESTRICTED",
  };
}
