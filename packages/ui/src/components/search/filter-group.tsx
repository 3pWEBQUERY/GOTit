"use client";

import { ChevronDown } from "lucide-react";
import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { cn } from "../../cn";

/** Vorgabe für Gruppen innerhalb eines Behälters: Im `FilterSheet` starten sie eingeklappt. */
export const FilterGroupDefaults = createContext<{ defaultOpen: boolean }>({ defaultOpen: true });

export interface FilterGroupProps {
  /** Überschrift der Gruppe (Text der `legend`), zum Beispiel «Standort». */
  title: ReactNode;
  /** Kurzfassung der Auswahl neben der Überschrift, zum Beispiel «Beispielstadt, 10 km». */
  summary?: ReactNode;
  /** Ohne Einklappen ist die Überschrift reiner Text. */
  collapsible?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

/**
 * Gruppe von Filtern als `fieldset` mit `legend`. Eingeklappt bleiben die
 * Felder im Dokument, damit ihre Eingaben erhalten bleiben.
 */
export function FilterGroup({ title, summary, collapsible = true, open: openProp, defaultOpen, onOpenChange, children, className }: FilterGroupProps) {
  const defaults = useContext(FilterGroupDefaults);
  const [ownOpen, setOwnOpen] = useState(defaultOpen ?? defaults.defaultOpen);
  const contentId = useId();
  const open = collapsible ? (openProp ?? ownOpen) : true;

  function toggle() {
    setOwnOpen(!open);
    onOpenChange?.(!open);
  }

  return (
    <fieldset className={cn("min-w-0 border-t border-border first:border-t-0", className)}>
      <legend className="float-left w-full p-0">
        {collapsible ? (
          <button type="button" aria-expanded={open} aria-controls={contentId} onClick={toggle} className="flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left text-ink">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-body font-[550]">{title}</span>
              {summary ? <span className="text-small text-ink-muted">{summary}</span> : null}
            </span>
            <ChevronDown aria-hidden strokeWidth={1.5} className={cn("size-5 shrink-0 text-ink-muted transition-transform duration-state", open && "rotate-180")} />
          </button>
        ) : (
          <span className="flex min-h-11 flex-col justify-center gap-1 py-3">
            <span className="text-body font-[550] text-ink">{title}</span>
            {summary ? <span className="text-small text-ink-muted">{summary}</span> : null}
          </span>
        )}
      </legend>
      <div id={contentId} hidden={!open} className={cn("clear-both flex-col gap-4 pb-4", open && "flex")}>
        {children}
      </div>
    </fieldset>
  );
}
