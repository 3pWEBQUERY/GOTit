"use client";

import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "../../cn";
import { IconButton } from "../actions/icon-button";
import { addDays, addMonths, clampIsoDate, endOfWeek, isoToUtcDate, isWithinRange, monthGrid, parseIsoDate, startOfWeek, todayIso } from "./date-parsing";

export interface DateFieldCalendarLabels {
  previousMonth: string;
  nextMonth: string;
  /** Grund für Tage ausserhalb von `min` und `max`, zum Beispiel «Liegt in der Vergangenheit». */
  outOfRange?: string;
}

export interface DateFieldCalendarProps {
  /** Gewählter Tag als `YYYY-MM-DD`. */
  value: string | null;
  onSelect: (iso: string) => void;
  min?: string;
  max?: string;
  /** Gibt den Grund zurück, warum ein Tag nicht wählbar ist, sonst `null`. */
  isDateDisabled?: (iso: string) => string | null;
  /** Sprache für Monats- und Wochentagsnamen, zum Beispiel `de-CH`. */
  locale: string;
  labels: DateFieldCalendarLabels;
  /** Heutiges Datum als `YYYY-MM-DD`. Ohne Angabe gilt die Uhr des Geräts. */
  today?: string;
  className?: string;
}

const keySteps: Record<string, (iso: string, shift: boolean) => string> = {
  ArrowLeft: (iso) => addDays(iso, -1),
  ArrowRight: (iso) => addDays(iso, 1),
  ArrowUp: (iso) => addDays(iso, -7),
  ArrowDown: (iso) => addDays(iso, 7),
  Home: (iso) => startOfWeek(iso),
  End: (iso) => endOfWeek(iso),
  PageUp: (iso, shift) => addMonths(iso, shift ? -12 : -1),
  PageDown: (iso, shift) => addMonths(iso, shift ? 12 : 1),
};

/**
 * Monatsraster nach dem Grid-Muster von WAI-ARIA, Wochenbeginn Montag.
 * Pfeiltasten bewegen um Tag und Woche, Home und End zum Wochenrand,
 * PageUp und PageDown um einen Monat (mit Umschalt um ein Jahr).
 * Nicht wählbare Tage bleiben fokussierbar, damit ihr Grund lesbar ist.
 */
export function DateFieldCalendar({ value, onSelect, min, max, isDateDisabled, locale, labels, today, className }: DateFieldCalendarProps) {
  const titleId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const moveFocusRef = useRef(false);
  const [deviceToday] = useState(() => todayIso());
  const currentDay = today ?? deviceToday;
  const [focused, setFocused] = useState(() => clampIsoDate(value ?? currentDay, min, max));
  const month = parseIsoDate(focused) ?? { year: 2000, month: 1, day: 1 };
  const weeks = monthGrid(month.year, month.month);
  const monthPrefix = focused.slice(0, 7);

  const formats = useMemo(
    () => ({
      title: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
      day: new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }),
      weekdayShort: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }),
      weekdayLong: new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }),
    }),
    [locale],
  );

  useEffect(() => {
    if (!moveFocusRef.current) return;
    moveFocusRef.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${focused}"]`)?.focus();
  }, [focused]);

  const reasonFor = (iso: string): string | null => {
    if (!isWithinRange(iso, min, max)) return labels.outOfRange ?? "";
    return isDateDisabled?.(iso) ?? null;
  };
  const goTo = (iso: string, moveFocus: boolean) => {
    moveFocusRef.current = moveFocus;
    setFocused(clampIsoDate(iso, min, max));
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = keySteps[event.key];
    if (!step) return;
    event.preventDefault();
    goTo(step(focused, event.shiftKey), true);
  };

  const focusedReason = reasonFor(focused);
  const canGoBack = !min || monthPrefix > min.slice(0, 7);
  const canGoForward = !max || monthPrefix < max.slice(0, 7);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <IconButton
          label={labels.previousMonth}
          icon={<ChevronLeft strokeWidth={1.5} />}
          aria-disabled={!canGoBack || undefined}
          className="aria-disabled:opacity-55"
          onClick={() => (canGoBack ? goTo(addMonths(focused, -1), false) : undefined)}
        />
        <p id={titleId} aria-live="polite" className="text-small font-[550] text-ink">
          {formats.title.format(isoToUtcDate(focused))}
        </p>
        <IconButton
          label={labels.nextMonth}
          icon={<ChevronRight strokeWidth={1.5} />}
          aria-disabled={!canGoForward || undefined}
          className="aria-disabled:opacity-55"
          onClick={() => (canGoForward ? goTo(addMonths(focused, 1), false) : undefined)}
        />
      </div>
      <div ref={gridRef} role="grid" aria-labelledby={titleId} className="flex flex-col">
        <div role="row" className="flex">
          {(weeks[0] ?? []).map((iso) => (
            <span key={iso} role="columnheader" aria-label={formats.weekdayLong.format(isoToUtcDate(iso))} className="flex size-11 items-center justify-center text-label text-ink-muted">
              {formats.weekdayShort.format(isoToUtcDate(iso))}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0]} role="row" className="flex">
            {week.map((iso) => {
              if (!iso.startsWith(monthPrefix)) return <span key={iso} role="gridcell" className="size-11" />;
              const reason = reasonFor(iso);
              const selected = iso === value;
              const name = formats.day.format(isoToUtcDate(iso));
              return (
                <span key={iso} role="gridcell" aria-selected={selected} className="size-11">
                  <button
                    type="button"
                    data-date={iso}
                    tabIndex={iso === focused ? 0 : -1}
                    aria-label={reason ? `${name}, ${reason}` : name}
                    aria-disabled={reason !== null || undefined}
                    aria-current={iso === currentDay ? "date" : undefined}
                    title={reason || undefined}
                    onClick={() => (reason === null ? onSelect(iso) : goTo(iso, false))}
                    onFocus={() => (iso === focused ? undefined : goTo(iso, false))}
                    onKeyDown={handleKeyDown}
                    className={cn(
                      "tabular flex size-11 items-center justify-center rounded-control border border-transparent text-small text-ink transition-colors duration-state",
                      "hover:bg-surface-2 aria-[current=date]:border-border-strong aria-[current=date]:font-[650]",
                      "aria-disabled:cursor-not-allowed aria-disabled:text-ink-muted aria-disabled:line-through aria-disabled:hover:bg-transparent",
                      selected && "bg-ink font-[550] text-bg hover:bg-ink",
                    )}
                  >
                    {Number(iso.slice(8))}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <p className="flex min-h-10 items-start gap-1 px-2 py-1 text-small text-ink-muted">
        {focusedReason ? (
          <>
            <Info aria-hidden strokeWidth={1.5} className="mt-px size-[1.125rem] shrink-0" />
            <span>{focusedReason}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
