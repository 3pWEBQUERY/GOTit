import { RETENTION_DAYS } from "../retention";
import type { NotificationChannel, NotificationEvent } from "./schemas";

export type NotificationSettings = Partial<Record<NotificationEvent, Partial<Record<NotificationChannel, boolean>>>>;

/** Voreinstellung: E-Mail für Ereignisse, die eine Handlung verlangen; Push gibt es noch nicht. */
const DEFAULTS: Record<NotificationEvent, Record<NotificationChannel, boolean>> = {
  message: { email: true, push: false },
  bookingRequest: { email: true, push: false },
  bookingStatus: { email: true, push: false },
  review: { email: false, push: false },
  verification: { email: true, push: false },
  security: { email: true, push: false },
};

export function resolveNotifications(stored: unknown): Record<NotificationEvent, Record<NotificationChannel, boolean>> {
  const settings = (typeof stored === "object" && stored !== null ? stored : {}) as NotificationSettings;
  return Object.fromEntries(
    Object.entries(DEFAULTS).map(([event, channels]) => [event, { ...channels, ...settings[event as NotificationEvent] }]),
  ) as Record<NotificationEvent, Record<NotificationChannel, boolean>>;
}

/** Sicherheitshinweise lassen sich nicht vollständig abschalten: E-Mail bleibt an. */
export function isLockedNotification(event: NotificationEvent, channel: NotificationChannel): boolean {
  return event === "security" && channel === "email";
}

export function deletionDueDate(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + RETENTION_DAYS.accountDeletionGrace * 24 * 60 * 60 * 1000);
}

/** Slug für ein neues Anbieterprofil oder eine Organisation: lesbar, mit Zufallsteil gegen Kollisionen und Raten. */
export function draftSlug(name: string, random: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "profil"}-${random}`;
}
