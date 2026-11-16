"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useId, type ReactNode } from "react";
import { cn } from "../../cn";
import { FieldGroup } from "./field-group";

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** Text der `legend`. */
  label: ReactNode;
  options: readonly RadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  disabled?: boolean;
  required?: boolean;
  orientation?: "vertical" | "horizontal";
  className?: string;
}

/** Eine Auswahl aus wenigen, immer sichtbaren Möglichkeiten. */
export function RadioGroup({ label, options, hint, error, optionalLabel, orientation = "vertical", className, ...rootProps }: RadioGroupProps) {
  const baseId = useId();
  return (
    <FieldGroup label={label} hint={hint} error={error} optionalLabel={optionalLabel} disabled={rootProps.disabled} className={className}>
      {(control) => (
        <RadioGroupPrimitive.Root {...rootProps} {...control} orientation={orientation} className={cn("flex", orientation === "vertical" ? "flex-col" : "flex-wrap gap-x-6")}>
          {options.map((option, index) => {
            const itemId = `${baseId}-${index}`;
            const descriptionId = option.description ? `${itemId}-description` : undefined;
            return (
              <div key={option.value} className="flex items-start gap-3 py-3">
                <RadioGroupPrimitive.Item
                  id={itemId}
                  value={option.value}
                  disabled={option.disabled}
                  aria-describedby={descriptionId}
                  className={cn(
                    "relative flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface",
                    "transition-colors duration-state before:absolute before:-inset-3 hover:border-ink data-[state=checked]:border-ink",
                    "disabled:cursor-not-allowed disabled:opacity-55",
                    error && "border-error",
                  )}
                >
                  <RadioGroupPrimitive.Indicator className="size-3 rounded-full bg-ink" />
                </RadioGroupPrimitive.Item>
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor={itemId} className={cn("text-body text-ink", (option.disabled || rootProps.disabled) && "text-ink-muted")}>
                    {option.label}
                  </label>
                  {option.description && descriptionId ? (
                    <p id={descriptionId} className="text-small text-ink-muted">
                      {option.description}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </RadioGroupPrimitive.Root>
      )}
    </FieldGroup>
  );
}
