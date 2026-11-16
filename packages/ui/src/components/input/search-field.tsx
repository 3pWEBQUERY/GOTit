"use client";

import { Search, X } from "lucide-react";
import { useComposedRefs } from "radix-ui/internal";
import { useRef, useState, type ComponentPropsWithRef, type ReactNode } from "react";
import { IconButton } from "../actions/icon-button";
import { ControlFrame, controlInputClass } from "./control-frame";
import { Field } from "./field";

export interface SearchFieldProps extends Omit<ComponentPropsWithRef<"input">, "type" | "value" | "defaultValue" | "prefix"> {
  label: ReactNode;
  /** Label nur für Screenreader; das Lupen-Icon und der Platzhalter tragen das Feld sichtbar. */
  hideLabel?: boolean;
  /** Zugänglicher Name des Buttons, der das Feld leert. */
  clearLabel: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Wird mit Enter aufgerufen, wenn das Feld kein eigenes Formular ist. */
  onSearch?: (value: string) => void;
  /** Umgibt das Feld mit `<form role="search">`; Enter sendet an `action`. */
  asForm?: boolean;
  action?: string;
  method?: "get" | "post";
  hint?: ReactNode;
}

/** Suchfeld mit Lupe und Leeren-Button. Mit `asForm` funktioniert es auch ohne JavaScript. */
export function SearchField({ label, hideLabel, clearLabel, value, defaultValue, onValueChange, onSearch, asForm, action, method, hint, id, className, ref, onChange, onKeyDown, ...props }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const composedRef = useComposedRefs(ref, inputRef);
  const [ownValue, setOwnValue] = useState(defaultValue ?? "");
  const text = value ?? ownValue;

  const update = (next: string) => {
    setOwnValue(next);
    onValueChange?.(next);
  };

  const field = (
    <Field label={label} hint={hint} hideLabel={hideLabel} id={id} className={asForm ? undefined : className}>
      {(control) => (
        <ControlFrame
          disabled={props.disabled}
          prefix={<Search aria-hidden strokeWidth={1.5} />}
          suffix={
            text && !props.disabled ? (
              <IconButton
                label={clearLabel}
                icon={<X strokeWidth={1.5} />}
                className="-my-px text-ink"
                onClick={() => {
                  update("");
                  inputRef.current?.focus();
                }}
              />
            ) : null
          }
        >
          <input
            {...props}
            {...control}
            ref={composedRef}
            type="search"
            enterKeyHint="search"
            value={text}
            onChange={(event) => {
              update(event.currentTarget.value);
              onChange?.(event);
            }}
            onKeyDown={(event) => {
              onKeyDown?.(event);
              if (event.key === "Enter" && !asForm && onSearch && !event.defaultPrevented) {
                event.preventDefault();
                onSearch(event.currentTarget.value);
              }
            }}
            className={controlInputClass}
          />
        </ControlFrame>
      )}
    </Field>
  );

  if (!asForm) return field;
  return (
    <form role="search" action={action} method={method ?? "get"} className={className} onSubmit={onSearch ? () => onSearch(text) : undefined}>
      {field}
    </form>
  );
}
