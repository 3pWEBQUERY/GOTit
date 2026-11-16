"use client";

import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../cn";

interface FilterChipBase {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface FilterChipToggleProps extends FilterChipBase {
  /** Umschaltbarer Schnellfilter («Heute»). */
  variant?: "toggle";
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  /** Icon vor dem Text; ist der Chip gedrückt, steht dort ein Haken. */
  icon?: ReactNode;
}

export interface FilterChipRemovableProps extends FilterChipBase {
  /** Aktiver Filter, der sich entfernen lässt. */
  variant: "removable";
  /** Zugänglicher Name des Entfernen-Buttons, zum Beispiel «Filter Heute entfernen». */
  removeLabel: string;
  onRemove: () => void;
}

export type FilterChipProps = FilterChipToggleProps | FilterChipRemovableProps;

const shape = "inline-flex min-h-11 shrink-0 items-center rounded-full border text-small font-[550] whitespace-nowrap select-none transition-colors duration-state";

/**
 * Chip der Suche in zwei Arten: Schnellfilter zum Umschalten (`aria-pressed`,
 * der Zustand zeigt sich zusätzlich als Haken) und aktiver Filter mit
 * eigenem Entfernen-Button.
 */
export function FilterChip(props: FilterChipProps) {
  if (props.variant === "removable") {
    const { children, removeLabel, onRemove, disabled, className } = props;
    return (
      <span className={cn(shape, "border-border-strong bg-surface pl-4 text-ink", disabled && "bg-surface-2 text-ink-muted", className)}>
        <span>{children}</span>
        <button
          type="button"
          aria-label={removeLabel}
          title={removeLabel}
          disabled={disabled}
          onClick={onRemove}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-state hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed"
        >
          <X aria-hidden strokeWidth={1.5} className="size-[1.125rem]" />
        </button>
      </span>
    );
  }

  const { children, pressed, onPressedChange, icon, disabled, className } = props;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        shape,
        "gap-2 px-4 disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:size-[1.125rem] [&_svg]:shrink-0",
        pressed ? "border-ink bg-ink text-bg hover:bg-ink/90" : "border-border-strong bg-surface text-ink hover:bg-surface-2 active:bg-border",
        className,
      )}
    >
      {pressed ? <Check aria-hidden strokeWidth={1.5} /> : icon}
      <span>{children}</span>
    </button>
  );
}
