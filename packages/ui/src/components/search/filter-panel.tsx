"use client";

import { useId, type ReactNode } from "react";
import { cn } from "../../cn";
import { Button } from "../actions/button";

export interface FilterPanelProps {
  /** Titel der Seitenleiste, zum Beispiel «Filter». */
  title: ReactNode;
  /** Ebene der Überschrift, passend zur Seite. */
  titleAs?: "h2" | "h3";
  /** Text des Buttons, zum Beispiel «Alle zurücksetzen». */
  resetLabel: string;
  onReset: () => void;
  /** Ist kein Filter gesetzt, ist Zurücksetzen nicht nötig. */
  resetDisabled?: boolean;
  /** Die Gruppen (`FilterGroup`). */
  children: ReactNode;
  className?: string;
}

/** Filter der Suche als Seitenleiste von 280 px für den Desktop. Filter wirken dort sofort. */
export function FilterPanel({ title, titleAs: Heading = "h2", resetLabel, onReset, resetDisabled, children, className }: FilterPanelProps) {
  const titleId = useId();
  return (
    <aside aria-labelledby={titleId} className={cn("flex w-70 max-w-full shrink-0 flex-col text-ink", className)}>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <Heading id={titleId} className="text-h3">
          {title}
        </Heading>
        <Button variant="quiet" disabled={resetDisabled} onClick={onReset} className="-mr-4">
          {resetLabel}
        </Button>
      </div>
      <div className="flex flex-col">{children}</div>
    </aside>
  );
}
