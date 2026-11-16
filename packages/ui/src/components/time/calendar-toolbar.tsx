"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "../../cn";
import { Button } from "../actions/button";
import { IconButton } from "../actions/icon-button";
import type { CalendarView } from "./calendar-types";

export interface CalendarToolbarLabels {
  /** Zum Beispiel «Vorherige Woche». Passt die App an die Ansicht an. */
  previous: string;
  next: string;
  /** Zum Beispiel «Heute». */
  today: string;
  /** Zugänglicher Name des Umschalters, zum Beispiel «Ansicht». */
  view: string;
  day: string;
  week: string;
  month: string;
}

export interface CalendarToolbarProps {
  /** Gezeigter Bereich als fertiger Text, zum Beispiel «16.–22. Nov. 2026». */
  title: string;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  labels: CalendarToolbarLabels;
  /** Angebotene Ansichten in dieser Reihenfolge. */
  views?: readonly CalendarView[];
  /** Aktionen rechts, zum Beispiel «Verfügbarkeit bearbeiten». */
  actions?: ReactNode;
  className?: string;
}

const ALL_VIEWS: readonly CalendarView[] = ["day", "week", "month"];

/** Kopfzeile aller Kalenderansichten: zurück, heute, vor, Bereichstitel, Umschalter Tag | Woche | Monat und Aktionen. */
export function CalendarToolbar({ title, view, onViewChange, onPrevious, onNext, onToday, labels, views = ALL_VIEWS, actions, className }: CalendarToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-3", className)}>
      <div className="flex items-center gap-1">
        <IconButton label={labels.previous} icon={<ChevronLeft strokeWidth={1.5} />} onClick={onPrevious} />
        <Button variant="secondary" onClick={onToday}>
          {labels.today}
        </Button>
        <IconButton label={labels.next} icon={<ChevronRight strokeWidth={1.5} />} onClick={onNext} />
      </div>
      <p aria-live="polite" className="tabular min-w-0 text-h3 text-ink">
        {title}
      </p>
      <ToggleGroupPrimitive.Root
        type="single"
        value={view}
        // Radix meldet beim erneuten Klick auf die aktive Ansicht einen leeren Wert; eine Ansicht bleibt immer gewählt.
        onValueChange={(next) => (next ? onViewChange(next as CalendarView) : undefined)}
        aria-label={labels.view}
        className="inline-flex rounded-control border border-border-strong bg-surface p-px"
      >
        {views.map((item) => (
          <ToggleGroupPrimitive.Item
            key={item}
            value={item}
            className={cn(
              "min-h-11 min-w-11 rounded-chip px-3 text-small font-[550] text-ink-muted transition-colors duration-state md:min-h-10",
              "hover:text-ink data-[state=on]:bg-ink data-[state=on]:text-bg",
            )}
          >
            {labels[item]}
          </ToggleGroupPrimitive.Item>
        ))}
      </ToggleGroupPrimitive.Root>
      {actions ? <div className="flex flex-wrap items-center gap-2 md:ml-auto">{actions}</div> : null}
    </div>
  );
}
