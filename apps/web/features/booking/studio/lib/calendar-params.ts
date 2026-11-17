/**
 * Zustand des Studio-Kalenders in der URL (PRD 13: Ansicht und Datum
 * teilbar, Zurück-Taste funktioniert). `ansicht` fehlt im Normalfall: Dann
 * zeigt der Kalender auf Mobile den Tag, ab 768 px die Woche (PRD 11.5).
 * `anfrage` und `blocker` öffnen das Seitenpanel zu einem Eintrag.
 */
export type CalendarViewParam = "day" | "week" | "month";

const VIEW_WORDS: Record<CalendarViewParam, string> = {
  day: "tag",
  week: "woche",
  month: "monat",
};

export interface CalendarParams {
  /** `null`: Standard, Tag auf Mobile und Woche ab 768 px. */
  view: CalendarViewParam | null;
  /** Gezeigter Tag `YYYY-MM-DD` oder `null` für heute. */
  date: string | null;
  request: string | null;
  block: string | null;
}

type Search = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | null {
  const text = Array.isArray(value) ? value[0] : value;
  return text && text.length > 0 ? text : null;
}

/** Gültiger Kalendertag `YYYY-MM-DD`, sonst `false`. */
export function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function id(value: string | null): string | null {
  return value && value.length <= 64 && /^[\w-]+$/.test(value) ? value : null;
}

export function parseCalendarParams(search: Search): CalendarParams {
  const viewWord = single(search.ansicht);
  const view =
    (Object.entries(VIEW_WORDS).find(([, word]) => word === viewWord)?.[0] as
      | CalendarViewParam
      | undefined) ?? null;
  const date = single(search.datum);
  return {
    view,
    date: date && isIsoDay(date) ? date : null,
    request: id(single(search.anfrage)),
    block: id(single(search.blocker)),
  };
}

/** Suchteil der URL, ohne leere Werte. Panels schliessen, wenn `request` und `block` fehlen. */
export function calendarQuery(params: Partial<CalendarParams>): string {
  const query = new URLSearchParams();
  if (params.view) query.set("ansicht", VIEW_WORDS[params.view]);
  if (params.date) query.set("datum", params.date);
  if (params.request) query.set("anfrage", params.request);
  else if (params.block) query.set("blocker", params.block);
  const text = query.toString();
  return text ? `?${text}` : "";
}

/** Schlüssel eines Eintrags im Raster: Art und Kennung, damit ein Klick weiss, was er öffnet. */
export type EntryKey =
  | { kind: "request"; id: string }
  | { kind: "block"; id: string }
  | { kind: "available"; start: string; end: string };

export function entryKey(id: string): EntryKey | null {
  const [kind, ...rest] = id.split(":");
  const value = rest.join(":");
  if (kind === "r" && value) return { kind: "request", id: value };
  if (kind === "b" && value) return { kind: "block", id: value };
  if (kind === "a") {
    const [start, end] = value.split("|");
    if (start && end) return { kind: "available", start, end };
  }
  return null;
}
