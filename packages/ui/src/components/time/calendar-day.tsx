"use client";

import { useMemo, useState } from "react";
import { cn } from "../../cn";
import { isoToUtcDate, todayIso } from "../input/date-parsing";
import { weekDays } from "./calendar-layout";
import { CalendarDayColumn, CalendarHourAxis, CalendarTimeZoneNote } from "./calendar-time-grid";
import type { CalendarEntry } from "./calendar-types";

export interface CalendarDayLabels {
  /** Wort für den heutigen Tag, zum Beispiel «Heute». */
  today: string;
  /** Zugänglicher Name des Wochenstreifens, zum Beispiel «Tag wählen». */
  weekStrip: string;
  /** Satz für einen Tag ohne Einträge. */
  emptyDay?: string;
}

export interface CalendarDayProps {
  /** Gezeigter Tag als `YYYY-MM-DD`. */
  date: string;
  entries: readonly CalendarEntry[];
  locale: string;
  labels: CalendarDayLabels;
  /** Meldet den Tag, der im Wochenstreifen gewählt wurde. */
  onDateChange?: (dateIso: string) => void;
  /** Wochenstreifen über der Zeitleiste (Standard für Mobile). */
  weekStrip?: boolean;
  startHour?: number;
  endHour?: number;
  today?: string;
  timeZoneNote?: string;
  onEntrySelect?: (entry: CalendarEntry) => void;
  className?: string;
}

/**
 * Tagesansicht als Zeitleiste, auf Mobile die Standardansicht (PRD 11.5). Der Wochenstreifen
 * zeigt die sieben Tage der Woche als Buttons; der gezeigte Tag ist gedrückt, heute ist markiert.
 */
export function CalendarDay({ date, entries, locale, labels, onDateChange, weekStrip = true, startHour = 8, endHour = 22, today, timeZoneNote, onEntrySelect, className }: CalendarDayProps) {
  const [deviceToday] = useState(() => todayIso());
  const currentDay = today ?? deviceToday;
  const hours = { startHour, endHour };
  const formats = useMemo(
    () => ({
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }),
      day: new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }),
      full: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    }),
    [locale],
  );
  const fullName = (iso: string) => (iso === currentDay ? `${formats.full.format(isoToUtcDate(iso))}, ${labels.today}` : formats.full.format(isoToUtcDate(iso)));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {weekStrip ? (
        <div role="group" aria-label={labels.weekStrip} className="grid grid-cols-7 gap-1">
          {weekDays(date).map((iso) => {
            const selected = iso === date;
            const isToday = iso === currentDay;
            const utc = isoToUtcDate(iso);
            return (
              <button
                key={iso}
                type="button"
                aria-pressed={selected}
                aria-current={isToday ? "date" : undefined}
                onClick={() => onDateChange?.(iso)}
                className={cn(
                  "flex min-h-12 min-w-0 flex-col items-center justify-center rounded-control border border-transparent py-1 text-label font-normal text-ink-muted transition-colors duration-state",
                  "hover:bg-surface-2 aria-pressed:bg-ink aria-pressed:text-bg",
                  isToday && "border-border-strong text-ink",
                )}
              >
                {/* Der Name beginnt mit dem sichtbaren Kurztext (WCAG 2.5.3) und nennt danach das volle Datum. */}
                <span>{formats.weekday.format(utc)}</span>
                <span className={cn("tabular text-small", (isToday || selected) && "font-[650]")}>{formats.day.format(utc)}</span>
                <span className="sr-only">, {fullName(iso)}</span>
                {isToday ? <span aria-hidden className="h-0.5 w-4 rounded-full bg-accent" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {timeZoneNote ? <CalendarTimeZoneNote>{timeZoneNote}</CalendarTimeZoneNote> : null}
      <div className="flex pt-2">
        <CalendarHourAxis hours={hours} />
        <CalendarDayColumn
          dateIso={date}
          entries={entries}
          hours={hours}
          onEntrySelect={onEntrySelect}
          listLabel={fullName(date)}
          emptyLabel={labels.emptyDay}
          emptyVisible
          className="min-w-0 flex-1 border-l border-border"
        />
      </div>
    </div>
  );
}
