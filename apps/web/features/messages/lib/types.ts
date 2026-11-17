/**
 * Daten des Messengers, wie sie in Client-Komponenten gehen: Zeiten als
 * ISO-Text, ohne Kennungen der Gegenseite (Entscheid 0014).
 */
export interface ClientAttachment {
  id: string;
  width: number | null;
  height: number | null;
}

export interface ClientMessage {
  id: string;
  /** Nur eigene Nachrichten: die Kennung, mit der der Browser sie gesendet hat. */
  clientId: string | null;
  fromMe: boolean;
  body: string | null;
  deleted: boolean;
  /** Von der Moderation ausgeblendet: für beide Seiten ohne Text und Bilder. */
  hidden: boolean;
  createdAt: string;
  status: "sent" | "read" | null;
  attachments: ClientAttachment[];
}

export interface ClientCounterpart {
  /** Fertiger Name: Anzeigename, Benutzername oder «Mitglied seit 2026». */
  name: string;
  profileSlug: string | null;
  /** Nur auf der Anbieterseite: Beitrittsjahr des Mitglieds. */
  memberSinceYear: number | null;
}

export interface ClientThread {
  conversationId: string;
  role: "MEMBER" | "PROVIDER";
  counterpart: ClientCounterpart;
  messages: ClientMessage[];
  hasOlder: boolean;
  blockedByMe: boolean;
  starred: boolean;
  archived: boolean;
  note: string | null;
  labelIds: string[];
  /** Eingeschränkt durch die Moderation (v1 9.2): Ende als ISO-Text, `until: null` ohne Ende. */
  messagingRestriction: { until: string | null } | null;
}

export interface ClientPendingAttachment {
  id: string;
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  failureReason: string | null;
  width: number | null;
  height: number | null;
}

export interface ClientLabel {
  id: string;
  name: string;
}

/** Mitglied oder Studio: bestimmt Pfade und Zusätze (Labels, Notiz). */
export type MessengerArea = "member" | "studio";
