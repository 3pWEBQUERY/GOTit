import type { BookingStatus, CalendarDayCounts, CalendarEntry, CalendarEntryKind, CalendarView } from "@app/ui";

/** Festes Beispieldatum, damit die Testseite an jedem Tag gleich aussieht: Montag, 16.11.2026. */
export const DEMO_TODAY = "2026-11-16";

export const demoEntries: CalendarEntry[] = [
  { id: "frei-mo", start: "2026-11-16T14:00", end: "2026-11-16T20:00", kind: "available", label: "Arbeitszeit", statusLabel: "Verfügbar" },
  { id: "frei-di", start: "2026-11-17T14:00", end: "2026-11-17T20:00", kind: "available", label: "Arbeitszeit", statusLabel: "Verfügbar" },
  { id: "frei-mi", start: "2026-11-18T12:00", end: "2026-11-18T20:00", kind: "available", label: "Arbeitszeit", statusLabel: "Verfügbar" },
  { id: "termin-mo", start: "2026-11-16T18:00", end: "2026-11-16T19:30", kind: "confirmed", label: "Beispielgast A", statusLabel: "Bestätigt" },
  { id: "anfrage-mi", start: "2026-11-18T16:00", end: "2026-11-18T17:00", kind: "request", label: "Beispielgast B", statusLabel: "Angefragt" },
  { id: "termin-mi", start: "2026-11-18T18:00", end: "2026-11-18T19:00", kind: "confirmed", label: "Beispielgast C", statusLabel: "Bestätigt" },
  { id: "anfrage-do-1", start: "2026-11-19T15:00", end: "2026-11-19T17:00", kind: "request", label: "Beispielgast D", statusLabel: "Angefragt" },
  { id: "anfrage-do-2", start: "2026-11-19T16:00", end: "2026-11-19T18:00", kind: "request", label: "Beispielgast E", statusLabel: "In Abstimmung" },
  { id: "blocker-fr", start: "2026-11-20T18:00", end: "2026-11-20T21:00", kind: "blocker", label: "Beispielblocker", statusLabel: "Blockiert" },
  { id: "termin-naechste", start: "2026-11-25T15:00", end: "2026-11-25T16:30", kind: "confirmed", label: "Beispielgast F", statusLabel: "Bestätigt" },
  { id: "blocker-dez", start: "2026-12-02T10:00", end: "2026-12-02T12:00", kind: "blocker", label: "Beispielblocker", statusLabel: "Blockiert" },
];

export const kindWords: Record<CalendarEntryKind, { one: string; label: string }> = {
  available: { one: "verfügbar", label: "Verfügbar: gedämpfte Fläche" },
  request: { one: "Anfrage", label: "Anfrage: gestrichelter Rand" },
  confirmed: { one: "bestätigt", label: "Bestätigt: Akzentfläche" },
  blocker: { one: "Blocker", label: "Blocker: schraffiert" },
};

export const legendItems = (Object.keys(kindWords) as CalendarEntryKind[]).map((kind) => ({ kind, label: kindWords[kind].label }));

/** Text für Screenreader zu den Marken eines Tages in der Monatsübersicht. */
export function demoDayLabel(_dateIso: string, counts: CalendarDayCounts): string {
  return (Object.keys(kindWords) as CalendarEntryKind[])
    .filter((kind) => counts[kind] > 0)
    .map((kind) => `${counts[kind]} ${kindWords[kind].one}`)
    .join(", ");
}

function utc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

const dayTitle = new Intl.DateTimeFormat("de-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const monthTitle = new Intl.DateTimeFormat("de-CH", { month: "long", year: "numeric", timeZone: "UTC" });
const shortDay = new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "short", timeZone: "UTC" });
const shortDayYear = new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Bereichstitel der Kopfzeile. In der App kommt er aus der Formatierung der jeweiligen Sprache. */
export function demoRangeTitle(view: CalendarView, dateIso: string, week: readonly string[]): string {
  if (view === "day") return dayTitle.format(utc(dateIso));
  if (view === "month") return monthTitle.format(utc(dateIso));
  const first = week[0] ?? dateIso;
  const last = week[6] ?? dateIso;
  return `${shortDay.format(utc(first))} – ${shortDayYear.format(utc(last))}`;
}

export const viewWords: Record<CalendarView, { previous: string; next: string }> = {
  day: { previous: "Vorherigen Tag anzeigen", next: "Nächsten Tag anzeigen" },
  week: { previous: "Vorherige Woche anzeigen", next: "Nächste Woche anzeigen" },
  month: { previous: "Vorherigen Monat anzeigen", next: "Nächsten Monat anzeigen" },
};

export const statusWords: Record<BookingStatus, string> = {
  requested: "Angefragt",
  negotiating: "In Abstimmung",
  confirmed: "Bestätigt",
  declined: "Abgelehnt",
  cancelled: "Abgesagt",
  expired: "Abgelaufen",
  completed: "Stattgefunden",
  disputed: "Strittig",
};

export const ZONE_NOTE = "Alle Zeiten in der Zeitzone des Beispielstudios (Zürich). Deine Zeitzone weicht davon ab.";
