/**
 * Zeitangaben des Messengers in Schweizer Format und Zeit (PRD 13: `TT.MM.JJJJ`,
 * 24 Stunden). Immer mit fester Zeitzone, damit Server und Browser dasselbe
 * zeigen.
 */
const ZONE = "Europe/Zurich";
const DAY_MS = 24 * 3600 * 1000;

function intlLocale(locale: string): string {
  return `${locale}-CH`;
}

/** Kalendertag in Zürich als `JJJJ-MM-TT`, zum Gruppieren und Vergleichen. */
export function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Abstand in Kalendertagen zwischen zwei Zeitpunkten, in Zürich gezählt. */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${dayKey(fromIso)}T00:00:00Z`);
  const to = Date.parse(`${dayKey(toIso)}T00:00:00Z`);
  return Math.round((to - from) / DAY_MS);
}

export function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

/** Genaue Angabe für den Tooltip, zum Beispiel «17.11.2026, 14:02». */
export function formatDateTime(iso: string, locale: string): string {
  return `${formatDate(iso, locale)}, ${formatTime(iso, locale)}`;
}

export interface DayWords {
  today: string;
  yesterday: string;
}

/** Trenner im Verlauf: «Heute», «Gestern» oder «Di., 17.11.2026». */
export function dayLabel(
  iso: string,
  nowIso: string,
  locale: string,
  words: DayWords,
): string {
  const days = daysBetween(iso, nowIso);
  if (days === 0) return words.today;
  if (days === 1) return words.yesterday;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: ZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

/** Zeit in der Liste: heute die Uhrzeit, gestern «Gestern», in der letzten Woche der Wochentag, sonst das Datum. */
export function listTime(
  iso: string,
  nowIso: string,
  locale: string,
  yesterday: string,
): string {
  const days = daysBetween(iso, nowIso);
  if (days <= 0) return formatTime(iso, locale);
  if (days === 1) return yesterday;
  if (days < 7)
    return new Intl.DateTimeFormat(intlLocale(locale), {
      timeZone: ZONE,
      weekday: "long",
    }).format(new Date(iso));
  return formatDate(iso, locale);
}

/** Jahr in Zürich, für «Mitglied seit 2026». */
export function yearOf(iso: string): number {
  return Number(dayKey(iso).slice(0, 4));
}
