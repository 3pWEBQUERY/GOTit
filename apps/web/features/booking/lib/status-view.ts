import type { BookingRole, BookingStatus } from "@app/core/booking";
import type {
  BookingRequestStatusKind,
  BookingStatus as UiBookingStatus,
} from "@app/ui";

/** Status des Kerns für die Komponenten des Designsystems; das Wort kommt immer dazu (v2 11.5). */
export function uiStatus(status: BookingStatus): UiBookingStatus {
  return status.toLowerCase() as UiBookingStatus;
}

const CARD_KIND: Record<BookingStatus, BookingRequestStatusKind> = {
  REQUESTED: "pending",
  NEGOTIATING: "countered",
  CONFIRMED: "accepted",
  COMPLETED: "accepted",
  DECLINED: "declined",
  DISPUTED: "declined",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

export function cardKind(status: BookingStatus): BookingRequestStatusKind {
  return CARD_KIND[status];
}

export function isOpen(status: BookingStatus): boolean {
  return status === "REQUESTED" || status === "NEGOTIATING";
}

/**
 * Wort eines Ereignisses im Verlauf. «Aus Sicherheitsgründen abgesagt» sieht
 * nur, wer so abgesagt hat; die Gegenseite sieht «Abgesagt» (Entscheid 0016,
 * Oberfläche). Unbekannte Aktionen fallen auf den neuen Status zurück.
 */
export type EventWord =
  | "created"
  | "counter"
  | "accept"
  | "decline"
  | "cancel"
  | "cancelSafety"
  | "complete"
  | "dispute"
  | "expired";

export function eventWord(
  action: string,
  actorRole: BookingRole | null,
  viewerRole: BookingRole,
): EventWord | null {
  switch (action) {
    case "created":
    case "counter":
    case "accept":
    case "decline":
    case "cancel":
    case "complete":
    case "dispute":
    case "expired":
      return action;
    case "cancel-safety":
      return actorRole === viewerRole ? "cancelSafety" : "cancel";
    default:
      return null;
  }
}

/** Ein Grund ist für beide sichtbar, ausser bei der Absage aus Sicherheitsgründen: Ihn sieht nur, wer abgesagt hat. */
export function visibleReason(
  event: {
    action: string;
    actorRole: BookingRole | null;
    reason: string | null;
  },
  viewerRole: BookingRole,
): string | null {
  if (event.action === "cancel-safety" && event.actorRole !== viewerRole)
    return null;
  return event.reason;
}
