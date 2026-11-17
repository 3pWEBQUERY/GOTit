/**
 * Zustand einer Bewertung aus Sicht einer Seite (Entscheid 0017): das Wort für
 * den Status, ob ein Einspruch läuft und ob einer möglich ist. Der Autor darf
 * gegen «Abgelehnt» und «Entfernt» Einspruch erheben, der Anbieter gegen
 * «Veröffentlicht»; je Seite ist ein offener Einspruch möglich.
 */
export type ReviewStatusValue =
  | "PENDING"
  | "PUBLISHED"
  | "REJECTED"
  | "REMOVED";
export type AppealStatusValue = "OPEN" | "UPHELD" | "DISMISSED";

export interface AppealView {
  /** Ein Einspruch dieser Seite ist offen. */
  open: boolean;
  /** Ein neuer Einspruch ist möglich. */
  canAppeal: boolean;
  /** Ergebnis des letzten abgeschlossenen Einspruchs, falls es einen gibt. */
  last: "UPHELD" | "DISMISSED" | null;
}

const APPEALABLE: Record<"MEMBER" | "PROVIDER", readonly ReviewStatusValue[]> =
  {
    MEMBER: ["REJECTED", "REMOVED"],
    PROVIDER: ["PUBLISHED"],
  };

/** `appeals` in der Reihenfolge des Anlegens, älteste zuerst. */
export function appealView(
  side: "MEMBER" | "PROVIDER",
  status: ReviewStatusValue,
  appeals: readonly { status: AppealStatusValue }[],
): AppealView {
  const open = appeals.some((appeal) => appeal.status === "OPEN");
  const decided = appeals.filter((appeal) => appeal.status !== "OPEN");
  const lastDecided = decided[decided.length - 1];
  return {
    open,
    canAppeal: !open && APPEALABLE[side].includes(status),
    last:
      lastDecided && lastDecided.status !== "OPEN" ? lastDecided.status : null,
  };
}

/**
 * Entscheide, die die Moderation aus einem Status treffen kann (wie
 * `moderateReview` im Kern): aus «Wird geprüft» freigeben oder ablehnen, aus
 * «Veröffentlicht» entfernen, aus «Abgelehnt» oder «Entfernt» freigeben.
 */
export function decisionsFrom(
  status: ReviewStatusValue,
): readonly ("PUBLISHED" | "REJECTED" | "REMOVED")[] {
  if (status === "PENDING") return ["PUBLISHED", "REJECTED"];
  if (status === "PUBLISHED") return ["REMOVED"];
  return ["PUBLISHED"];
}
