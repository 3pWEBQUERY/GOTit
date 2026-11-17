/** Eingabe einer Ausnahme im Studio: Tag als YYYY-MM-DD, Zeiten als HH:MM. */
export interface ExceptionDraft {
  day: string;
  closed: boolean;
  from: string;
  to: string;
  note: string;
}

export type ExceptionError =
  | "dayRequired"
  | "timeRequired"
  | "endBeforeStart"
  | "noteTooLong";

const DAY_END = 24 * 60;

function minutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const value = Number(match[1]) * 60 + Number(match[2]);
  return value <= DAY_END ? value : null;
}

/** Prüft wie der Kern (`openingExceptionSchema`), damit Fehler sofort am Feld stehen. 23:59 gilt als Mitternacht. */
export function exceptionErrors(
  draft: ExceptionDraft,
): Partial<Record<keyof ExceptionDraft, ExceptionError>> {
  const errors: Partial<Record<keyof ExceptionDraft, ExceptionError>> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.day)) errors.day = "dayRequired";
  if (draft.note.trim().length > 200) errors.note = "noteTooLong";
  if (draft.closed) return errors;
  const start = minutes(draft.from);
  const end = minutes(draft.to);
  if (start === null) errors.from = "timeRequired";
  if (end === null) errors.to = "timeRequired";
  if (start !== null && end !== null && toEnd(end) <= start)
    errors.to = "endBeforeStart";
  return errors;
}

function toEnd(end: number): number {
  return end === DAY_END - 1 ? DAY_END : end;
}

/** Eingabe für `saveExceptionAction`; nur nach `exceptionErrors` ohne Befund aufrufen. */
export function toExceptionInput(draft: ExceptionDraft) {
  const start = minutes(draft.from);
  const end = minutes(draft.to);
  return {
    day: draft.day,
    closed: draft.closed,
    startMinute: draft.closed ? null : start,
    endMinute: draft.closed || end === null ? null : toEnd(end),
    note: draft.note,
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Minuten als HH:MM; Mitternacht am Ende erscheint als 24:00. */
export function minuteLabel(value: number): string {
  return `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
}
