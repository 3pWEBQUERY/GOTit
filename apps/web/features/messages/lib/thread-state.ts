import type { ClientMessage } from "./types";

/**
 * Zustand des Verlaufs im Browser (Entscheid 0014): gespeicherte Nachrichten
 * vom Server und der Ausgang mit optimistisch angezeigten Nachrichten. Eine
 * gesendete Nachricht ersetzt ihren Eintrag im Ausgang über die Kennung des
 * Browsers; so erscheint sie nie doppelt, auch nicht nach «Erneut senden».
 */
export type SendFailure =
  | "undeliverable"
  | "attachments"
  | "rate-limited"
  | "invalid"
  | "network";

export interface OutboxImage {
  id: string;
  src: string;
  width: number | null;
  height: number | null;
}

export interface OutboxEntry {
  clientId: string;
  body: string;
  images: OutboxImage[];
  createdAt: string;
  state: "sending" | "sent" | "failed";
  failure?: SendFailure;
  messageId?: string;
}

function byTime(a: { createdAt: string; id: string }, b: typeof a): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Ältere Seiten und die neueste Seite zusammenführen; die neueste gewinnt (Status, Löschungen). */
export function mergeMessages(
  older: readonly ClientMessage[],
  latest: readonly ClientMessage[],
): ClientMessage[] {
  const byId = new Map<string, ClientMessage>();
  for (const message of older) byId.set(message.id, message);
  for (const message of latest) byId.set(message.id, message);
  return [...byId.values()].sort(byTime);
}

/** Einträge des Ausgangs, die der Server noch nicht als gespeicherte Nachricht liefert. */
export function pendingOutbox(
  outbox: readonly OutboxEntry[],
  messages: readonly ClientMessage[],
): OutboxEntry[] {
  const clientIds = new Set(messages.map((message) => message.clientId));
  const ids = new Set(messages.map((message) => message.id));
  return outbox.filter(
    (entry) =>
      !clientIds.has(entry.clientId) &&
      !(entry.messageId && ids.has(entry.messageId)),
  );
}

export type TimelineItem =
  | { kind: "message"; key: string; createdAt: string; message: ClientMessage }
  | { kind: "outbox"; key: string; createdAt: string; entry: OutboxEntry }
  | { kind: "booking"; key: string; createdAt: string; bookingId: string };

/** Eine Terminanfrage der Unterhaltung, als Karte an ihrem Zeitpunkt (v2 11.4). */
export interface TimelineBooking {
  id: string;
  createdAt: string;
}

/**
 * Gespeicherte Nachrichten und offener Ausgang in einer Reihe. Eigene
 * Nachrichten tragen als Schlüssel ihre Browser-Kennung: Wird aus dem
 * Ausgang eine gespeicherte Nachricht, bleibt das Element dasselbe.
 */
export function buildTimeline(
  messages: readonly ClientMessage[],
  outbox: readonly OutboxEntry[],
  bookings: readonly TimelineBooking[] = [],
): TimelineItem[] {
  const stored: TimelineItem[] = messages.map((message) => ({
    kind: "message",
    key: message.clientId ? `c-${message.clientId}` : `m-${message.id}`,
    createdAt: message.createdAt,
    message,
  }));
  // Karten stehen zwischen den gespeicherten Nachrichten an ihrem Zeitpunkt; der Ausgang bleibt zuunterst.
  for (const booking of [...bookings].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : 1,
  )) {
    const index = stored.findIndex(
      (item) => item.createdAt > booking.createdAt,
    );
    const card: TimelineItem = {
      kind: "booking",
      key: `b-${booking.id}`,
      createdAt: booking.createdAt,
      bookingId: booking.id,
    };
    if (index === -1) stored.push(card);
    else stored.splice(index, 0, card);
  }
  const open: TimelineItem[] = pendingOutbox(outbox, messages)
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .map((entry) => ({
      kind: "outbox",
      key: `c-${entry.clientId}`,
      createdAt: entry.createdAt,
      entry,
    }));
  return [...stored, ...open];
}

/** Aufeinanderfolgende Einträge eines Kalendertags. */
export function groupByDay<T>(
  items: readonly T[],
  dayOf: (item: T) => string,
): { day: string; items: T[] }[] {
  const groups: { day: string; items: T[] }[] = [];
  for (const item of items) {
    const day = dayOf(item);
    const last = groups.at(-1);
    if (last && last.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return groups;
}

/** Neueste Nachricht der Gegenseite; bestimmt, ob «gelesen» gemeldet werden muss. */
export function latestIncoming(
  messages: readonly ClientMessage[],
): ClientMessage | undefined {
  return messages.findLast((message) => !message.fromMe);
}

/** Neu angekommene Nachrichten der Gegenseite seit dem letzten Stand, für die Ansage. */
export function newIncoming(
  known: ReadonlySet<string>,
  messages: readonly ClientMessage[],
): ClientMessage[] {
  return messages.filter(
    (message) => !message.fromMe && !message.deleted && !known.has(message.id),
  );
}

/** Ein Eintrag im Ausgang nach dem Ergebnis des Servers. */
export function settleOutbox(
  outbox: readonly OutboxEntry[],
  clientId: string,
  result: { ok: true; messageId: string } | { ok: false; failure: SendFailure },
): OutboxEntry[] {
  return outbox.map((entry) =>
    entry.clientId !== clientId
      ? entry
      : result.ok
        ? {
            ...entry,
            state: "sent",
            messageId: result.messageId,
            failure: undefined,
          }
        : { ...entry, state: "failed", failure: result.failure },
  );
}
