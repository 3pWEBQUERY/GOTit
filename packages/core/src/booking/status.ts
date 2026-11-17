/**
 * Statusmodell der Terminanfragen (PRD v1 FR-BOOKING-003, v2 11.5).
 *
 * - Angefragt → In Abstimmung (Gegenvorschlag), Bestätigt, Abgelehnt, Abgesagt, Abgelaufen
 * - In Abstimmung → In Abstimmung (weiterer Vorschlag), Bestätigt, Abgelehnt, Abgesagt, Abgelaufen
 * - Bestätigt → Abgesagt, Stattgefunden, Strittig
 * - Stattgefunden → Strittig
 * - Abgelehnt, Abgesagt, Abgelaufen, Strittig sind Endzustände.
 *
 * Absagen ist für beide Seiten in jedem offenen oder bestätigten Status
 * möglich, ohne Sperre (Abnahme 1.9, v1 FR-BOOKING-006). Wer was darf,
 * entscheidet `allowedActions`; Übergänge prüft `nextStatus`.
 */
export const BOOKING_STATUSES = [
  "REQUESTED",
  "NEGOTIATING",
  "CONFIRMED",
  "DECLINED",
  "CANCELLED",
  "EXPIRED",
  "COMPLETED",
  "DISPUTED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type BookingRole = "MEMBER" | "PROVIDER";

export type BookingAction =
  | "accept" // aktuellen Vorschlag der Gegenseite annehmen
  | "counter" // Gegenvorschlag
  | "decline" // Anfrage ablehnen (nur Anbieter, solange offen)
  | "cancel" // absagen, jederzeit vor dem Termin
  | "cancel-safety" // «Aus Sicherheitsgründen absagen», bietet das Melden an
  | "complete" // als stattgefunden bestätigen, nach dem Termin
  | "dispute"; // Streitfall melden, nach dem Termin

export const OPEN_STATUSES: readonly BookingStatus[] = [
  "REQUESTED",
  "NEGOTIATING",
];
export const FINAL_STATUSES: readonly BookingStatus[] = [
  "DECLINED",
  "CANCELLED",
  "EXPIRED",
  "DISPUTED",
];

export interface BookingFacts {
  status: BookingStatus;
  /** Wer den aktuell gültigen Vorschlag gemacht hat. */
  lastProposedBy: BookingRole;
  startsAt: Date;
  endsAt: Date;
}

/**
 * Was eine Seite gerade tun darf. Annehmen darf nur, wer den aktuellen
 * Vorschlag nicht selbst gemacht hat. Nach dem Ende des Termins gibt es
 * kein Absagen mehr, dafür «Stattgefunden» und «Strittig».
 */
export function allowedActions(
  facts: BookingFacts,
  role: BookingRole,
  now = new Date(),
): BookingAction[] {
  const over = now.getTime() >= facts.endsAt.getTime();
  const actions: BookingAction[] = [];
  if (OPEN_STATUSES.includes(facts.status)) {
    if (now.getTime() >= facts.startsAt.getTime())
      return ["cancel", "cancel-safety"];
    if (facts.lastProposedBy !== role) actions.push("accept");
    actions.push("counter");
    if (role === "PROVIDER") actions.push("decline");
    actions.push("cancel", "cancel-safety");
    return actions;
  }
  if (facts.status === "CONFIRMED") {
    if (!over) return ["cancel", "cancel-safety"];
    return ["complete", "dispute"];
  }
  if (facts.status === "COMPLETED") return ["dispute"];
  return [];
}

export function nextStatus(action: BookingAction): BookingStatus {
  switch (action) {
    case "accept":
      return "CONFIRMED";
    case "counter":
      return "NEGOTIATING";
    case "decline":
      return "DECLINED";
    case "cancel":
    case "cancel-safety":
      return "CANCELLED";
    case "complete":
      return "COMPLETED";
    case "dispute":
      return "DISPUTED";
  }
}

/** Offene Anfragen laufen ab, wenn ihre Frist vorbei ist oder der vorgeschlagene Beginn erreicht ist. */
export function isExpired(
  status: BookingStatus,
  expiresAt: Date,
  startsAt: Date,
  now = new Date(),
): boolean {
  if (!OPEN_STATUSES.includes(status)) return false;
  return now.getTime() >= Math.min(expiresAt.getTime(), startsAt.getTime());
}
