import type { ReactNode } from "react";
import { cn } from "../../cn";

export interface FilterBarProps {
  /** Zugänglicher Name der Leiste, zum Beispiel «Schnellfilter». */
  label: string;
  /** Führendes Element, das beim Scrollen stehen bleibt; in der Regel ein `FilterBarButton`. */
  leading?: ReactNode;
  /** Haftet oben. Unter 768 px ist die Leiste dann Glas (PRD 5.5), ab 768 px deckend. */
  sticky?: boolean;
  /** Die Chips. */
  children: ReactNode;
  className?: string;
}

/**
 * Chip-Leiste der Suche: eine Zeile ohne Umbruch, die horizontal scrollt.
 * Der letzte sichtbare Chip wird am Rand angeschnitten und zeigt so, dass es weitergeht.
 */
export function FilterBar({ label, leading, sticky, children, className }: FilterBarProps) {
  return (
    <div role="group" aria-label={label} data-sticky={sticky || undefined} className={cn("relative min-w-0", sticky && "sticky top-0 z-30", className)}>
      {sticky ? (
        <>
          {/* Glas ist ungeschichtetes CSS und lässt sich nicht per Breakpoint abschalten; darum zwei Flächen. */}
          <span aria-hidden data-filter-bar-glass className="glass absolute inset-0 md:hidden" />
          <span aria-hidden className="absolute inset-0 hidden border-b border-border bg-bg md:block" />
        </>
      ) : null}
      <div className={cn("relative flex min-w-0 items-center gap-2", sticky && "px-4 py-2 md:px-0")}>
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className={cn("flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain p-1 [scrollbar-width:none]", sticky && "-mr-4 pr-4 md:mr-0")}>{children}</div>
      </div>
    </div>
  );
}
