import { isIdentityValid, type IdentityCheckFacts } from "@app/core/verification";

export interface IdentityCheckRecord extends IdentityCheckFacts {
  checkedAt: Date | null;
  failureReason: string | null;
}

export type IdentityView =
  | { kind: "none" }
  | { kind: "pending" }
  | {
      kind: "valid";
      expiresAt: Date;
      checkedAt: Date | null;
      expiresInDays: number;
    }
  | { kind: "expired"; expiredAt: Date | null }
  | { kind: "rejected"; reason: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Grund einer Ablehnung, für den es einen Text gibt. Andere Schlüssel zeigen einen allgemeinen Text. */
export const FAILURE_REASONS = ["under-age", "not-verified", "document-unreadable", "liveness-failed"] as const;

/**
 * Status der letzten Identitätsprüfung in den fünf Zuständen der Oberfläche:
 * nicht begonnen, läuft, bestanden mit Ablaufdatum, abgelaufen, abgelehnt mit Grund.
 * Eine abgebrochene Prüfung gilt als nicht begonnen.
 */
export function identityView(check: IdentityCheckRecord | null, now = new Date()): IdentityView {
  if (!check || check.status === "CANCELLED") return { kind: "none" };
  if (check.status === "PENDING") return { kind: "pending" };
  if (check.status === "REJECTED") return { kind: "rejected", reason: check.failureReason ?? "not-verified" };
  if (check.status === "APPROVED" && isIdentityValid(check, now) && check.expiresAt) {
    return {
      kind: "valid",
      expiresAt: check.expiresAt,
      checkedAt: check.checkedAt,
      expiresInDays: Math.ceil((check.expiresAt.getTime() - now.getTime()) / DAY_MS),
    };
  }
  if (check.status === "APPROVED" && check.ageOver18 !== true) return { kind: "rejected", reason: "under-age" };
  return { kind: "expired", expiredAt: check.expiresAt };
}

/** Text-Schlüssel für einen Ablehnungsgrund. */
export function failureReasonKey(reason: string): (typeof FAILURE_REASONS)[number] | "other" {
  return (FAILURE_REASONS as readonly string[]).includes(reason) ? (reason as (typeof FAILURE_REASONS)[number]) : "other";
}

/** Läuft eine gültige Prüfung in höchstens so vielen Tagen ab, erscheint sie auf «Heute» (PRD 11.1). */
export const EXPIRY_WARNING_DAYS = 30;
