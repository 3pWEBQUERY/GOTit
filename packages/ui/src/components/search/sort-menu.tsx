"use client";

import { ChevronDown } from "lucide-react";
import { DropdownMenu as MenuPrimitive } from "radix-ui";
import { cn } from "../../cn";
import { Button } from "../actions/button";
import { Menu, MenuContent, MenuTrigger } from "../actions/menu";

export interface SortOption<Value extends string = string> {
  value: Value;
  label: string;
}

export interface SortMenuProps<Value extends string = string> {
  /** Bezeichnung vor der aktuellen Wahl, zum Beispiel «Sortierung». */
  label: string;
  /** Relevanz, Kürzlich aktualisiert, Neu, Preis. Keine Sortierung nach Beliebtheit (PRD 9.2). */
  options: readonly SortOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
  disabled?: boolean;
  /** Seite, an der das Menü ausgerichtet ist. */
  align?: "start" | "end";
  className?: string;
}

/** Sortierung als Menü mit genau einer Wahl. Der Auslöser nennt Bezeichnung und aktuelle Wahl. */
export function SortMenu<Value extends string = string>({ label, options, value, onValueChange, disabled, align = "start", className }: SortMenuProps<Value>) {
  const current = options.find((option) => option.value === value);

  function select(next: string) {
    const option = options.find((candidate) => candidate.value === next);
    if (option) onValueChange(option.value);
  }

  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="quiet" disabled={disabled} className={cn("group", className)}>
          <span className="inline-flex flex-wrap items-center justify-center gap-x-2">
            <span className="font-normal text-ink-muted">{label}</span>{" "}
            <span>{current?.label}</span>
            <ChevronDown aria-hidden strokeWidth={1.5} className="text-ink-muted transition-transform duration-state group-data-[state=open]:rotate-180" />
          </span>
        </Button>
      </MenuTrigger>
      <MenuContent align={align}>
        <MenuPrimitive.RadioGroup aria-label={label} value={value} onValueChange={select}>
          {options.map((option) => (
            <MenuPrimitive.RadioItem
              key={option.value}
              value={option.value}
              className={cn(
                "flex min-h-11 cursor-default items-center gap-3 rounded-chip px-3 py-2 text-small text-ink select-none",
                "transition-colors duration-state data-highlighted:bg-surface-2 data-[state=checked]:font-[550]",
              )}
            >
              <span className="flex size-[1.125rem] shrink-0 items-center justify-center rounded-full border border-border-strong">
                <MenuPrimitive.ItemIndicator className="size-2 rounded-full bg-ink" />
              </span>
              <span className="min-w-0 flex-1">{option.label}</span>
            </MenuPrimitive.RadioItem>
          ))}
        </MenuPrimitive.RadioGroup>
      </MenuContent>
    </Menu>
  );
}
