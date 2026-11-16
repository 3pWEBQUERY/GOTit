"use client";

import { Check } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import type { RefObject } from "react";
import { cn } from "../../cn";

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ComboboxListProps {
  id: string;
  labelId: string;
  /** Rahmen des Eingabefelds; Klicks darauf schliessen die Liste nicht. */
  anchorRef: RefObject<HTMLElement | null>;
  options: readonly ComboboxOption[];
  selectedValue: string | null;
  activeIndex: number;
  /** Text, wenn es keine Treffer gibt. */
  emptyLabel: string;
  loading?: boolean;
  /** Text während des Ladens. */
  loadingLabel?: string;
  onSelect: (option: ComboboxOption) => void;
  onActiveChange: (index: number) => void;
}

/** ID einer Option; der Eingang verweist mit `aria-activedescendant` darauf. */
export function comboboxOptionId(listId: string, index: number): string {
  return `${listId}-option-${index}`;
}

/** Schwebende Liste der Vorschläge einer `Combobox`, am Feld verankert. Der Fokus bleibt im Eingabefeld. */
export function ComboboxList({ id, labelId, anchorRef, options, selectedValue, activeIndex, emptyLabel, loading, loadingLabel, onSelect, onActiveChange }: ComboboxListProps) {
  const showEmpty = !loading && options.length === 0;
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        role="presentation"
        align="start"
        sideOffset={4}
        onMouseDown={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (event.target instanceof Node && anchorRef.current?.contains(event.target)) event.preventDefault();
        }}
        className="z-50 max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) animate-layer-in overflow-y-auto rounded-control border border-border bg-surface shadow-raised"
      >
        <div id={id} role="listbox" aria-labelledby={labelId} aria-busy={loading || undefined} className={cn(options.length > 0 && "p-1")}>
          {options.map((option, index) => (
            // Die Tastatur wird nach WAI-ARIA am Eingabefeld bedient; die Option selbst erhält nie den Fokus.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <div
              key={option.value}
              id={comboboxOptionId(id, index)}
              role="option"
              tabIndex={-1}
              aria-selected={option.value === selectedValue}
              aria-disabled={option.disabled || undefined}
              data-active={index === activeIndex ? "" : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => (option.disabled || index === activeIndex ? undefined : onActiveChange(index))}
              onClick={() => (option.disabled ? undefined : onSelect(option))}
              className={cn(
                "flex min-h-11 cursor-default items-center justify-between gap-2 rounded-chip px-3 py-2 text-body text-ink select-none",
                "data-active:bg-surface-2 aria-disabled:cursor-not-allowed aria-disabled:text-ink-muted aria-selected:font-[550]",
              )}
            >
              <span className="min-w-0">{option.label}</span>
              {option.value === selectedValue ? <Check aria-hidden strokeWidth={1.5} className="size-5 shrink-0" /> : null}
            </div>
          ))}
        </div>
        {loading && loadingLabel ? <p className="px-4 py-3 text-small text-ink-muted">{loadingLabel}</p> : null}
        {showEmpty ? <p className="px-4 py-3 text-small text-ink-muted">{emptyLabel}</p> : null}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}
