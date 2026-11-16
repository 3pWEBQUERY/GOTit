"use client";

import { Globe } from "lucide-react";
import { cn } from "../../cn";
import { CalendarEntryBlock } from "./calendar-entry-block";
import { formatHour, hourTicks, layoutDay, segmentsOverlap, type HourRange } from "./calendar-layout";
import type { CalendarEntry } from "./calendar-types";

/** Höhe einer Stunde im Raster, in rem. Ein Eintrag von 45 Minuten erreicht damit die Tippfläche von 44 px. */
export const HOUR_HEIGHT_REM = 3.75;

function gridHeight(hours: HourRange): string {
  return `${hourTicks(hours).length * HOUR_HEIGHT_REM}rem`;
}

/** Stundenachse links neben dem Raster, im 24-Stunden-Format. Dekorativ: Jeder Eintrag nennt seine Zeit selbst. */
export function CalendarHourAxis({ hours, className }: { hours: HourRange; className?: string }) {
  return (
    <div aria-hidden className={cn("relative w-12 shrink-0", className)} style={{ height: gridHeight(hours) }}>
      {hourTicks(hours).map((hour, index) => (
        <span key={hour} className="tabular absolute right-2 -translate-y-1/2 text-label font-normal text-ink-muted" style={{ top: `${index * HOUR_HEIGHT_REM}rem` }}>
          {formatHour(hour)}
        </span>
      ))}
    </div>
  );
}

export interface CalendarDayColumnProps {
  dateIso: string;
  entries: readonly CalendarEntry[];
  hours: HourRange;
  onEntrySelect?: (entry: CalendarEntry) => void;
  /** Zugänglicher Name der Liste, wenn kein Spaltenkopf sie benennt. */
  listLabel?: string;
  /** Satz für einen Tag ohne Einträge. */
  emptyLabel?: string;
  /** Zeigt `emptyLabel` sichtbar statt nur für Screenreader. */
  emptyVisible?: boolean;
  className?: string;
}

/** Ein Tag als Zeitleiste: Stundenlinien und die Einträge als positionierte Blöcke, in zeitlicher Reihenfolge erreichbar. */
export function CalendarDayColumn({ dateIso, entries, hours, onEntrySelect, listLabel, emptyLabel, emptyVisible, className }: CalendarDayColumnProps) {
  const segments = layoutDay(entries, dateIso, hours);
  const background = segments.filter((segment) => segment.layer === "background");
  const ordered = [...segments].sort((a, b) => a.startMinutes - b.startMinutes || (a.layer === b.layer ? 0 : a.layer === "background" ? -1 : 1));

  return (
    <div className={cn("relative", className)} style={{ height: gridHeight(hours) }}>
      <div aria-hidden className="absolute inset-0">
        {hourTicks(hours).map((hour, index) => (
          <div key={hour} className="absolute inset-x-0 border-t border-border" style={{ top: `${index * HOUR_HEIGHT_REM}rem` }} />
        ))}
      </div>
      {ordered.length === 0 ? (
        emptyLabel ? (
          <p className={emptyVisible ? "relative p-3 text-small text-ink-muted" : "sr-only"}>{emptyLabel}</p>
        ) : null
      ) : (
        <ul aria-label={listLabel} className="absolute inset-0">
          {ordered.map((segment) => {
            const foreground = segment.layer === "foreground";
            const overAvailability = foreground && background.some((other) => segmentsOverlap(segment, other));
            return (
              <li
                key={segment.entry.id}
                className={cn("absolute p-px", foreground && "z-10", overAvailability && "pl-2")}
                style={{
                  top: `${segment.top * 100}%`,
                  height: `${segment.height * 100}%`,
                  left: `${(segment.column / segment.columns) * 100}%`,
                  width: `${100 / segment.columns}%`,
                }}
              >
                <CalendarEntryBlock segment={segment} onSelect={onEntrySelect} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Hinweis auf die Zeitzone der angezeigten Zeiten. Die App übergibt ihn nur, wenn die Zone des Betrachters abweicht. */
export function CalendarTimeZoneNote({ children, className }: { children: string; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-small text-ink-muted", className)}>
      <Globe aria-hidden strokeWidth={1.5} className="mt-px size-[1.125rem] shrink-0" />
      <span>{children}</span>
    </p>
  );
}
