import type {
  BookingAction,
  BookingRole,
  BookingStatus,
} from "@app/core/booking";

/**
 * Terminanfragen, wie sie in Client-Komponenten gehen: Zeiten als ISO-Text,
 * ohne Kennungen der Gegenseite und ohne die private Notiz (Entscheid 0016).
 */
export interface ClientSlot {
  start: string;
  end: string;
}

/** Freie Zeiten eines Profils in der Zeitzone des Anbieters (v2 10.2). */
export interface ClientSlots {
  timeZone: string;
  slots: ClientSlot[];
}

export interface ClientBooking {
  id: string;
  conversationId: string;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  expiresAt: string;
  createdAt: string;
  timeZone: string;
  /** Anzeigename (Mitglied sieht den Anbieter) oder Benutzername (Anbieter sieht das Mitglied). */
  counterpartName: string;
  profileSlug: string;
  role: BookingRole;
  lastProposedBy: BookingRole;
  actions: BookingAction[];
  regionName: string | null;
  message: string | null;
}

export interface ClientBookingEvent {
  id: string;
  /** `null`: das System, zum Beispiel beim Ablauf. */
  actorRole: BookingRole | null;
  action: string;
  toStatus: BookingStatus;
  startsAt: string | null;
  endsAt: string | null;
  reason: string | null;
  createdAt: string;
}

export type MemberTab = "offen" | "bestaetigt" | "vergangen";
export const MEMBER_TABS: readonly MemberTab[] = [
  "offen",
  "bestaetigt",
  "vergangen",
];
