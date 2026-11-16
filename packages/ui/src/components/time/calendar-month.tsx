"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "../../cn";
import { addDays, endOfWeek, isoToUtcDate, startOfWeek, todayIso } from "../input/date-parsing";
import { countEntriesForDay, monthWeeks } from "./calendar-layout";
import { CalendarKindMark } from "./calendar-legend";
import { CalendarTimeZoneNote } from "./calendar-time-grid";
import { CALENDAR_ENTRY_KINDS, type CalendarDayCounts, type CalendarEntry } from "./calendar-types";

export interface CalendarMonthProps {
  /** Gezeigter Monat als `YYYY-MM` (ein ganzes Datum wird auf den Monat gekürzt). */
  month: string;
  entries: readonly CalendarEntry[];
  locale: string;
  /** Zugänglicher Name des Rasters, zum Beispiel «November 2026». */
  label: string;
  /** Text für Screenreader zu den Einträgen eines Tages, zum Beispiel «2 bestätigt, 1 Anfrage». Leer, wenn nichts ansteht. */
  dayLabel: (dateIso: string, counts: CalendarDayCounts) => string;
  /** Wort für den heutigen Tag, zum Beispiel «Heute». */
  todayLabel: string;
  /** Hervorgehobener Tag als `YYYY-MM-DD`. */
  selectedDate?: string | null;
  onDateSelect?: (dateIso: string) => void;
  today?: string;
  timeZoneNote?: string;
  className?: string;
}

const keySteps: Record<string, (iso: string) => string> = {
  ArrowLeft: (iso) => addDays(iso, -1),
  ArrowRight: (iso) => addDays(iso, 1),
  ArrowUp: (iso) => addDays(iso, -7),
  ArrowDown: (iso) => addDays(iso, 7),
  Home: (iso) => startOfWeek(iso),
  End: (iso) => endOfWeek(iso),
};

/**
 * Monatsübersicht mit Marken je Tag (PRD 11.5), Wochenbeginn Montag. Das Raster hat einen
 * Tabstopp; Pfeiltasten bewegen um Tag und Woche, Home und End zum Wochenrand. Tage der
 * Nachbarmonate sind gedämpft und wählbar. Die Marken sind dekorativ, ihr Inhalt steht in `dayLabel`.
 */
export function CalendarMonth({ month, entries, locale, label, dayLabel, todayLabel, selectedDate, onDateSelect, today, timeZoneNote, className }: CalendarMonthProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [deviceToday] = useState(() => todayIso());
  const currentDay = today ?? deviceToday;
  const monthPrefix = month.slice(0, 7);
  const weeks = monthWeeks(monthPrefix);
  const days = weeks.flat();
  const [focusedState, setFocused] = useState<string | null>(null);
  const fallback = selectedDate && days.includes(selectedDate) ? selectedDate : currentDay.startsWith(monthPrefix) ? currentDay : `${monthPrefix}-01`;
  const focused = focusedState && days.includes(focusedState) ? focusedState : fallback;

  const formats = useMemo(
    () => ({
      day: new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }),
      weekdayShort: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }),
      weekdayLong: new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }),
    }),
    [locale],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, iso: string) => {
    const step = keySteps[event.key];
    if (!step) return;
    event.preventDefault();
    const next = step(iso);
    if (!days.includes(next)) return;
    setFocused(next);
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${next}"]`)?.focus();
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {timeZoneNote ? <CalendarTimeZoneNote>{timeZoneNote}</CalendarTimeZoneNote> : null}
      <div ref={gridRef} role="grid" aria-label={label} className="flex flex-col">
      <div role="row" className="grid grid-cols-7">
        {(weeks[0] ?? []).map((iso) => (
          <span key={iso} role="columnheader" aria-label={formats.weekdayLong.format(isoToUtcDate(iso))} className="flex min-h-8 items-center justify-center text-label font-normal text-ink-muted">
            {formats.weekdayShort.format(isoToUtcDate(iso))}
          </span>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} role="row" className="grid grid-cols-7 border-t border-border">
          {week.map((iso) => {
            const counts = countEntriesForDay(entries, iso);
            const summary = dayLabel(iso, counts);
            const isToday = iso === currentDay;
            const selected = iso === selectedDate;
            const outside = !iso.startsWith(monthPrefix);
            const name = [formats.day.format(isoToUtcDate(iso)), isToday ? todayLabel : "", summary].filter(Boolean).join(", ");
            return (
              <span key={iso} role="gridcell" aria-selected={selected} className="min-w-0 p-px">
                <button
                  type="button"
                  data-date={iso}
                  tabIndex={iso === focused ? 0 : -1}
                  aria-label={name}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => onDateSelect?.(iso)}
                  onFocus={() => setFocused(iso)}
                  onKeyDown={(event) => handleKeyDown(event, iso)}
                  className={cn(
                    "flex min-h-16 w-full flex-col items-center gap-1 rounded-control border border-transparent py-2 text-small text-ink transition-colors duration-state",
                    "hover:bg-surface-2",
                    outside && "text-ink-muted opacity-55",
                    selected && "border-ink bg-surface-2",
                  )}
                >
                  <span aria-hidden className={cn("tabular flex flex-col items-center", isToday && "font-[650]")}>
                    {Number(iso.slice(8))}
                    <span className={cn("h-0.5 w-4 rounded-full", isToday ? "bg-accent" : "bg-transparent")} />
                  </span>
                  <span aria-hidden className="flex min-h-2 flex-wrap items-center justify-center gap-1">
                    {CALENDAR_ENTRY_KINDS.filter((kind) => counts[kind] > 0).map((kind) => (
                      <CalendarKindMark key={kind} kind={kind} />
                    ))}
                  </span>
                </button>
              </span>
            );
          })}
        </div>
      ))}
      </div>
    </div>
  );
}
