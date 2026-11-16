"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type { FocusEventHandler, ReactNode, Ref } from "react";
import { cn } from "../../cn";
import { controlBoxClass } from "./control-frame";
import { Field } from "./field";

export interface SelectOption {
  /** Darf nicht leer sein (Vorgabe von Radix). Für «keine Auswahl» den Wert weglassen. */
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label: ReactNode;
  options: readonly SelectOption[];
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Name des versteckten nativen Felds für Formulare. */
  name?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  hideLabel?: boolean;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  ref?: Ref<HTMLButtonElement>;
  className?: string;
}

/** Auswahl aus einer festen Liste. Für lange oder durchsuchbare Listen `Combobox` verwenden. */
export function Select({ label, options, placeholder, hint, error, optionalLabel, hideLabel, id, onBlur, ref, className, ...rootProps }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} optionalLabel={optionalLabel} hideLabel={hideLabel} id={id} className={className}>
      {(control) => (
        <SelectPrimitive.Root {...rootProps}>
          <SelectPrimitive.Trigger
            {...control}
            ref={ref}
            onBlur={onBlur}
            className={cn(controlBoxClass, "flex items-center justify-between gap-2 px-3 text-left data-placeholder:text-ink-muted")}
          >
            <span className="min-w-0 py-2">
              <SelectPrimitive.Value placeholder={placeholder} />
            </span>
            <SelectPrimitive.Icon asChild>
              <ChevronDown aria-hidden strokeWidth={1.5} className="size-5 shrink-0 text-ink-muted" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={4}
              className={cn(
                "z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden",
                "animate-layer-in rounded-control border border-border bg-surface text-ink shadow-raised",
              )}
            >
              <SelectPrimitive.Viewport className="p-1">
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={cn(
                      "flex min-h-11 cursor-default items-center justify-between gap-2 rounded-chip px-3 py-2 text-body outline-none select-none",
                      "data-highlighted:bg-surface-2 data-disabled:cursor-not-allowed data-disabled:text-ink-muted data-[state=checked]:font-[550]",
                    )}
                  >
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator>
                      <Check aria-hidden strokeWidth={1.5} className="size-5 shrink-0" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      )}
    </Field>
  );
}
