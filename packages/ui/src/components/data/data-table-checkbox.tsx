"use client";

import { Check, Minus } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cn } from "../../cn";

export interface DataTableCheckboxProps {
  /** Zugänglicher Name; das Kästchen hat in der Tabelle keinen sichtbaren Text. */
  label: string;
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Kästchen der Mehrfachauswahl ohne sichtbares Label, mit Tippfläche von 44 px. */
export function DataTableCheckbox({ label, checked, onCheckedChange, disabled, className }: DataTableCheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      aria-label={label}
      title={label}
      checked={checked}
      disabled={disabled}
      onCheckedChange={(next) => onCheckedChange(next === true)}
      className={cn(
        "group relative flex size-6 shrink-0 items-center justify-center rounded-chip border border-border-strong bg-surface text-bg",
        "transition-colors duration-state before:absolute before:-inset-2.5 hover:border-ink",
        "data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=indeterminate]:border-ink data-[state=indeterminate]:bg-ink",
        "disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check aria-hidden strokeWidth={1.5} className="hidden size-4 group-data-[state=checked]:block" />
        <Minus aria-hidden strokeWidth={1.5} className="hidden size-4 group-data-[state=indeterminate]:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
