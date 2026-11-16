"use client";

import { LayoutGrid, List } from "lucide-react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "../../cn";

export type ViewMode = "grid" | "list";

export interface ViewToggleProps {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
  /** Zugänglicher Name der Gruppe, zum Beispiel «Ansicht». */
  label: string;
  /** Zugängliche Namen der beiden Möglichkeiten, zum Beispiel «Raster» und «Liste». */
  labels: { grid: string; list: string };
  disabled?: boolean;
  className?: string;
}

const itemClass = cn(
  "flex size-11 items-center justify-center rounded-chip text-ink-muted transition-colors duration-state",
  "hover:text-ink data-[state=on]:bg-ink data-[state=on]:text-bg disabled:cursor-not-allowed disabled:opacity-55",
);

/** Umschalter zwischen Raster und Liste. Eine der beiden Ansichten ist immer gewählt. */
export function ViewToggle({ value, onValueChange, label, labels, disabled, className }: ViewToggleProps) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      aria-label={label}
      value={value}
      disabled={disabled}
      // Radix meldet beim erneuten Klick auf die aktive Wahl einen leeren Wert; die Ansicht bleibt dann stehen.
      onValueChange={(next) => (next === "grid" || next === "list" ? onValueChange(next) : undefined)}
      className={cn("inline-flex w-fit shrink-0 gap-1 rounded-control border border-border-strong bg-surface p-1", className)}
    >
      <ToggleGroupPrimitive.Item value="grid" aria-label={labels.grid} title={labels.grid} className={itemClass}>
        <LayoutGrid aria-hidden strokeWidth={1.5} className="size-5" />
      </ToggleGroupPrimitive.Item>
      <ToggleGroupPrimitive.Item value="list" aria-label={labels.list} title={labels.list} className={itemClass}>
        <List aria-hidden strokeWidth={1.5} className="size-5" />
      </ToggleGroupPrimitive.Item>
    </ToggleGroupPrimitive.Root>
  );
}
