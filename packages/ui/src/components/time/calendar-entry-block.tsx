"use client";

import { useId } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";
import { formatSegmentTime, type DaySegment } from "./calendar-layout";
import type { CalendarEntry, CalendarEntryKind } from "./calendar-types";

const kindClasses: Record<CalendarEntryKind, string> = {
  available: "border-transparent bg-surface-2 text-ink hover:bg-border",
  request: "border-dashed border-ink bg-surface text-ink hover:bg-surface-2",
  confirmed: "border-transparent bg-accent text-on-accent hover:bg-accent/90",
  blocker: "border-border-strong bg-surface text-ink hover:border-ink",
};

/** Schraffur des Blockers als SVG-Muster in der Farbe der Linie; so bleibt sie in beiden Themes ruhig. */
function Hatch() {
  const id = useId();
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full text-border-strong">
      <defs>
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export interface CalendarEntryBlockProps {
  segment: Pick<DaySegment, "entry" | "startMinutes" | "endMinutes">;
  onSelect?: (entry: CalendarEntry) => void;
  className?: string;
}

/**
 * Ein Eintrag im Raster. Die Art bestimmt die Form (PRD 11.5): verfügbar als gedämpfte
 * Fläche, Anfrage mit gestricheltem Rand, bestätigt als Akzentfläche, Blocker schraffiert.
 * Der Status steht immer zusätzlich als Wort am Eintrag und im zugänglichen Namen.
 */
export function CalendarEntryBlock({ segment, onSelect, className }: CalendarEntryBlockProps) {
  const { entry } = segment;
  const time = formatSegmentTime(segment);
  const classes = cn(
    "relative flex size-full min-h-11 flex-col items-start overflow-hidden rounded-chip border px-2 py-1 text-left transition-colors duration-state",
    kindClasses[entry.kind],
    className,
  );
  const content = (
    <>
      {entry.kind === "blocker" ? <Hatch /> : null}
      <span className={cn("relative flex max-w-full min-w-0 flex-col", entry.kind === "blocker" && "rounded-chip bg-surface px-1")}>
        <span className="tabular text-label">
          {time}
          <span className="sr-only">,</span>
        </span>
        <span className="text-small font-[550]">
          {entry.label}
          <span className="sr-only">,</span>
        </span>
        <span className="text-label font-normal">{entry.statusLabel}</span>
      </span>
    </>
  );
  if (entry.href) {
    return (
      <UiLink href={entry.href} data-kind={entry.kind} className={classes} onClick={() => onSelect?.(entry)}>
        {content}
      </UiLink>
    );
  }
  return (
    <button type="button" data-kind={entry.kind} className={classes} onClick={() => onSelect?.(entry)}>
      {content}
    </button>
  );
}
