"use client";

import { Check, Minus } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { useId, type FocusEventHandler, type ReactNode, type Ref } from "react";
import { cn } from "../../cn";
import { FieldMessage } from "./field-message";

export interface CheckboxProps {
  /** Beschriftung rechts vom Kästchen. */
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  /** `"indeterminate"` zeigt den Zwischenzustand (ein Teil der Unterpunkte ist gewählt). */
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
  name?: string;
  value?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  ref?: Ref<HTMLButtonElement>;
  className?: string;
}

/** Kästchen mit Label. Mit `name` entsteht ein natives Feld für das Formular. */
export function Checkbox({ label, description, error, id, className, ...props }: CheckboxProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <div className="flex items-start gap-3 py-3">
        <CheckboxPrimitive.Root
          {...props}
          id={controlId}
          aria-describedby={[errorId, descriptionId].filter(Boolean).join(" ") || undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            "group relative flex size-6 shrink-0 items-center justify-center rounded-chip border border-border-strong bg-surface text-bg",
            "transition-colors duration-state before:absolute before:-inset-3 hover:border-ink aria-invalid:border-error",
            "data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=indeterminate]:border-ink data-[state=indeterminate]:bg-ink",
            "disabled:cursor-not-allowed disabled:opacity-55",
          )}
        >
          <CheckboxPrimitive.Indicator className="flex items-center justify-center">
            <Check aria-hidden strokeWidth={1.5} className="hidden size-4 group-data-[state=checked]:block" />
            <Minus aria-hidden strokeWidth={1.5} className="hidden size-4 group-data-[state=indeterminate]:block" />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={controlId} className={cn("text-body text-ink", props.disabled && "text-ink-muted")}>
            {label}
          </label>
          {description && descriptionId ? (
            <p id={descriptionId} className="text-small text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {error && errorId ? (
        <FieldMessage id={errorId} kind="error">
          {error}
        </FieldMessage>
      ) : null}
    </div>
  );
}
