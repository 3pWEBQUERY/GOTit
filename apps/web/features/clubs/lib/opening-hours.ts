/**
 * Öffnungszeiten der Standorte (v2 9.4, Entscheid 0018). Reine Funktionen,
 * im Browser und auf dem Server gleich.
 *
 * - Wochentag 0 = Sonntag … 6 = Samstag, wie bei der Verfügbarkeit der Anbieter.
 * - Ein Fenster liegt innerhalb eines Tages (0 bis 1440). Nach Mitternacht
 *   geht es als Fenster ab 00:00 am Folgetag weiter; die Anzeige fügt beide
 *   zu «22:00–02:00» zusammen.
 * - Eine Ausnahme ersetzt die Zeiten ihres Tages ganz: geschlossen oder ein
 *   anderes Fenster.
 * - «Heute» rechnet in Europe/Zurich.
 */
export const TIME_ZONE = "Europe/Zurich";
const DAY = 24 * 60;

export interface HoursWindow {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface HoursException {
  /** YYYY-MM-DD */
  day: string;
  closed: boolean;
  startMinute: number | null;
  endMinute: number | null;
  note: string | null;
}

/** Ein Zeitraum in Minuten ab Beginn eines Tages; `end` darf über 1440 gehen. */
export interface Span {
  start: number;
  end: number;
}

export type TodayStatus =
  | { kind: "open"; until: number }
  | { kind: "later"; from: number; until: number }
  | { kind: "over" }
  | { kind: "closed" };

/** Kalendertag, Wochentag und Minute eines Zeitpunkts in Europe/Zurich. */
export function zurichNow(date: Date): {
  day: string;
  weekday: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: `${value("year")}-${value("month")}-${value("day")}`,
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      value("weekday"),
    ),
    minute: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, date + days))
    .toISOString()
    .slice(0, 10);
}

function weekdayOf(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

/** Fenster eines Kalendertags: die Ausnahme, falls es eine gibt, sonst die Wochenzeiten. */
export function windowsOfDay(
  day: string,
  hours: readonly HoursWindow[],
  exceptions: readonly HoursException[],
): Span[] {
  const exception = exceptions.find((entry) => entry.day === day);
  if (exception) {
    if (
      exception.closed ||
      exception.startMinute === null ||
      exception.endMinute === null
    )
      return [];
    return [{ start: exception.startMinute, end: exception.endMinute }];
  }
  const weekday = weekdayOf(day);
  return hours
    .filter((entry) => entry.weekday === weekday)
    .map((entry) => ({ start: entry.startMinute, end: entry.endMinute }))
    .sort((a, b) => a.start - b.start);
}

/** Fügt aneinanderstossende oder überlappende Zeiträume zusammen. */
function merge(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const out: Span[] = [];
  for (const span of sorted) {
    const last = out[out.length - 1];
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else out.push({ ...span });
  }
  return out;
}

/**
 * Status für «heute»: jetzt geöffnet bis …, später geöffnet, heute vorbei
 * oder heute geschlossen. Ein Fenster der Nacht davor, das über Mitternacht
 * reicht, zählt als geöffnet; ein Fenster bis 24:00 läuft in das Fenster ab
 * 00:00 des Folgetags weiter.
 */
export function todayStatus(
  hours: readonly HoursWindow[],
  exceptions: readonly HoursException[],
  now: Date,
): TodayStatus {
  const { day, minute } = zurichNow(now);
  const spans = merge(
    [-1, 0, 1].flatMap((offset) =>
      windowsOfDay(addDays(day, offset), hours, exceptions).map((span) => ({
        start: span.start + offset * DAY,
        end: span.end + offset * DAY,
      })),
    ),
  );
  const current = spans.find(
    (span) => span.start <= minute && minute < span.end,
  );
  if (current) return { kind: "open", until: current.end };
  const later = spans.find((span) => span.start > minute && span.start < DAY);
  if (later) return { kind: "later", from: later.start, until: later.end };
  const today = spans.some((span) => span.end > 0 && span.start < DAY);
  return today ? { kind: "over" } : { kind: "closed" };
}

/** Wochentage in Schweizer Reihenfolge, Montag zuerst (v2 13). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/**
 * Wochenzeiten pro Tag ab Montag. Ein Fenster bis 24:00 nimmt das Fenster ab
 * 00:00 des Folgetags auf («22:00–02:00»); dieses erscheint dort nicht noch
 * einmal.
 */
export function weeklyRows(
  hours: readonly HoursWindow[],
): { weekday: number; spans: Span[] }[] {
  const byDay = (weekday: number) =>
    hours
      .filter((entry) => entry.weekday === weekday)
      .map((entry) => ({ start: entry.startMinute, end: entry.endMinute }))
      .sort((a, b) => a.start - b.start);
  const continues = (weekday: number) => {
    const previous = byDay((weekday + 6) % 7);
    const last = previous[previous.length - 1];
    return Boolean(last && last.end === DAY && last.start > 0);
  };
  return WEEK_ORDER.map((weekday) => {
    const own = byDay(weekday);
    const spans = continues(weekday)
      ? own.filter((span, index) => !(index === 0 && span.start === 0))
      : own;
    const next = byDay((weekday + 1) % 7)[0];
    const last = spans[spans.length - 1];
    if (last && last.end === DAY && last.start > 0 && next?.start === 0)
      return {
        weekday,
        spans: [
          ...spans.slice(0, -1),
          { start: last.start, end: DAY + next.end },
        ],
      };
    return { weekday, spans };
  });
}

/** «02:00» für 1560, «24:00» für genau Mitternacht am Ende eines Tages. */
export function formatMinute(minute: number): string {
  const value = minute === DAY ? DAY : minute % DAY;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatSpan(span: Span): string {
  return `${formatMinute(span.start)}–${formatMinute(span.end)}`;
}
