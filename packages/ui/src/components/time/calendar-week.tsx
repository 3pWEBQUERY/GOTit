"use client";

import { useMemo, useState } from "react";
import { cn } from "../../cn";
import { isoToUtcDate, todayIso } from "../input/date-parsing";
import { weekDays } from "./calendar-layout";
import { CalendarDayColumn, CalendarHourAxis, CalendarTimeZoneNote } from "./calendar-time-grid";
import type { CalendarEntry } from "./calendar-types";

export interface CalendarWeekLabels {
  /** Wort für den heutigen Tag, zum Beispiel «Heute». Wird am Spaltenkopf vorgelesen. */
  today: string;
  /** Satz für einen Tag ohne Einträge, für Screenreader. */
  emptyDay?: string;
}

export interface CalendarWeekProps {
  /** Ein Tag der gezeigten Woche als `YYYY-MM-DD`. Die Woche beginnt am Montag. */
  date: string;
  entries: readonly CalendarEntry[];
  /** Sprache für Wochentage und Datum, zum Beispiel `de-CH`. */
  locale: string;
  /** Zugänglicher Name der Tabelle, zum Beispiel «Kalender, 16. bis 22. November 2026». */
  label: string;
  labels: CalendarWeekLabels;
  /** Erste sichtbare Stunde (0 bis 23). */
  startHour?: number;
  /** Ende der sichtbaren Stunden (1 bis 24). */
  endHour?: number;
  /** Heutiges Datum als `YYYY-MM-DD`. Ohne Angabe gilt die Uhr des Geräts. */
  today?: string;
  /** Hinweis wie «Zeiten in Mitteleuropäischer Zeit (Zürich)», wenn die Zone des Betrachters abweicht. */
  timeZoneNote?: string;
  onEntrySelect?: (entry: CalendarEntry) => void;
  className?: string;
}

/**
 * Wochenansicht Montag bis Sonntag mit Stundenachse (PRD 11.5). Zeiten stehen so da,
 * wie sie übergeben werden (Zone des Anbieters). Unter 768 px ist `CalendarDay` die passende Ansicht.
 */
export function CalendarWeek({ date, entries, locale, label, labels, startHour = 8, endHour = 22, today, timeZoneNote, onEntrySelect, className }: CalendarWeekProps) {
  const [deviceToday] = useState(() => todayIso());
  const currentDay = today ?? deviceToday;
  const hours = { startHour, endHour };
  const formats = useMemo(
    () => ({
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }),
      day: new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }),
      full: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
    }),
    [locale],
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {timeZoneNote ? <CalendarTimeZoneNote>{timeZoneNote}</CalendarTimeZoneNote> : null}
      <div className="flex">
        <CalendarHourAxis hours={hours} className="mt-12" />
        <table aria-label={label} className="min-w-0 flex-1 table-fixed border-collapse">
          <thead>
            <tr>
              {weekDays(date).map((iso) => {
                const isToday = iso === currentDay;
                const utc = isoToUtcDate(iso);
                return (
                  <th
                    key={iso}
                    scope="col"
                    aria-current={isToday ? "date" : undefined}
                    className={cn("h-12 border-t-2 border-transparent px-1 text-center align-middle text-label font-normal text-ink-muted", isToday && "border-accent text-ink")}
                  >
                    <span aria-hidden className="flex flex-col items-center xs:flex-row xs:justify-center xs:gap-1">
                      <span>{formats.weekday.format(utc)}</span>
                      <span className={cn("tabular", isToday && "font-[650]")}>{formats.day.format(utc)}</span>
                    </span>
                    <span className="sr-only">{isToday ? `${formats.full.format(utc)}, ${labels.today}` : formats.full.format(utc)}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr>
              {weekDays(date).map((iso) => (
                <td key={iso} className="border-l border-border p-0 align-top">
                  <CalendarDayColumn dateIso={iso} entries={entries} hours={hours} onEntrySelect={onEntrySelect} emptyLabel={labels.emptyDay} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
