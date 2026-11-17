import type { CalendarView } from "@app/ui";

/**
 * Zeitangaben im Studio: Schweizer Format, 24 Stunden, immer in der Zone des
 * Anbieters (PRD 11.5, 13). Server und Browser zeigen so dasselbe.
 */
function intlLocale(locale: string): string {
  return `${locale}-CH`;
}

function parts(locale: string, timeZone: string) {
  return {
    date: new Intl.DateTimeFormat(intlLocale(locale), {
      timeZone,
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: new Intl.DateTimeFormat(intlLocale(locale), {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }),
    day: new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
  };
}

/** «Do., 19.11.2026, 18:00–19:00»; über Mitternacht mit beiden Daten. */
export function formatSpan(
  start: Date,
  end: Date,
  locale: string,
  timeZone: string,
): string {
  const format = parts(locale, timeZone);
  const sameDay = format.day.format(start) === format.day.format(end);
  const endsAtMidnight =
    format.time.format(end) === "00:00" &&
    end.getTime() - start.getTime() <= 24 * 3600_000;
  if (sameDay || endsAtMidnight)
    return `${format.date.format(start)}, ${format.time.format(start)}–${endsAtMidnight && !sameDay ? "24:00" : format.time.format(end)}`;
  return `${format.date.format(start)}, ${format.time.format(start)} – ${format.date.format(end)}, ${format.time.format(end)}`;
}

/** «Do., 19.11.2026, 18:00». */
export function formatMoment(
  date: Date,
  locale: string,
  timeZone: string,
): string {
  const format = parts(locale, timeZone);
  return `${format.date.format(date)}, ${format.time.format(date)}`;
}

/** Dauer in Stunden und Minuten, zum Beispiel `{ hours: 1, minutes: 30 }`. */
export function durationParts(
  start: Date,
  end: Date,
): { hours: number; minutes: number } {
  const total = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60_000),
  );
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** Titel der Kopfzeile: «Mittwoch, 18. November 2026», «16.–22. Nov. 2026» oder «November 2026». */
export function rangeTitle(
  view: CalendarView,
  day: string,
  weekFirst: string,
  weekLast: string,
  locale: string,
): string {
  const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);
  const lang = intlLocale(locale);
  if (view === "day")
    return new Intl.DateTimeFormat(lang, {
      timeZone: "UTC",
      dateStyle: "full",
    }).format(utc(day));
  if (view === "month")
    return new Intl.DateTimeFormat(lang, {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    }).format(utc(day));
  return new Intl.DateTimeFormat(lang, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatRange(utc(weekFirst), utc(weekLast));
}
