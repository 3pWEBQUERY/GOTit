/**
 * Zeitangaben der Termine (PRD 13: `TT.MM.JJJJ`, 24 Stunden) immer in der
 * Zeitzone des Anbieters (v2 11.5). Weicht die Zone des Betrachters ab, steht
 * ihr Name dabei; das entscheidet `zoneSuffix` im Browser.
 */
function intlLocale(locale: string): string {
  return `${locale}-CH`;
}

export function formatDay(
  iso: string,
  timeZone: string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatClock(
  iso: string,
  timeZone: string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/** «Do., 19.11.2026, 18:00–19:00»; über Mitternacht mit beiden Tagen. */
export function formatRange(
  startIso: string,
  endIso: string,
  timeZone: string,
  locale: string,
): string {
  const startDay = formatDay(startIso, timeZone, locale);
  const endDay = formatDay(endIso, timeZone, locale);
  const start = formatClock(startIso, timeZone, locale);
  const end = formatClock(endIso, timeZone, locale);
  return startDay === endDay
    ? `${startDay}, ${start}–${end}`
    : `${startDay}, ${start} – ${endDay}, ${end}`;
}

/** «17.11.2026, 14:05», für Verlauf und Tooltips. */
export function formatStamp(
  iso: string,
  timeZone: string,
  locale: string,
): string {
  const date = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
  return `${date}, ${formatClock(iso, timeZone, locale)}`;
}

/** Name der Zone in der Sprache der Seite, zum Beispiel «Mitteleuropäische Zeit». */
export function zoneName(timeZone: string, locale: string): string {
  const parts = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone,
    timeZoneName: "longGeneric",
  }).formatToParts(new Date());
  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

/** Zeigt die Uhr des Betrachters zum Zeitpunkt etwas anderes als die des Anbieters? */
export function zoneDiffers(
  iso: string,
  timeZone: string,
  viewerZone: string | null,
): boolean {
  if (!viewerZone || viewerZone === timeZone) return false;
  const wall = (zone: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  try {
    return wall(timeZone) !== wall(viewerZone);
  } catch {
    return false;
  }
}

/** « (Mitteleuropäische Zeit)» oder nichts, wenn die Uhr des Betrachters gleich geht. */
export function zoneSuffix(
  iso: string,
  timeZone: string,
  viewerZone: string | null,
  locale: string,
): string {
  return zoneDiffers(iso, timeZone, viewerZone)
    ? ` (${zoneName(timeZone, locale)})`
    : "";
}

/** Dauer in Stunden und Minuten; die Wörter kommen aus den Übersetzungen. */
export function durationParts(minutes: number): {
  hours: number;
  minutes: number;
} {
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}
