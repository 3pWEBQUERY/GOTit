"use client";

import { useId, type ReactNode } from "react";
import { cn } from "../../cn";
import { FieldMessage } from "./field-message";

/** Attribute für das Gruppen-Element innerhalb von `FieldGroup`. */
export interface FieldGroupControl {
  "aria-labelledby": string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
}

export interface FieldGroupProps {
  /** Text der `legend`. */
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode | ((control: FieldGroupControl) => ReactNode);
}

/** Gruppe zusammengehöriger Auswahlfelder als `fieldset` mit `legend`, Hinweis und Fehler. */
export function FieldGroup({ label, hint, error, optionalLabel, disabled, className, children }: FieldGroupProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const control: FieldGroupControl = { "aria-labelledby": `${id}-legend`, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined };

  return (
    <fieldset disabled={disabled} aria-describedby={describedBy} className={cn("flex min-w-0 flex-col gap-2", className)}>
      <legend id={control["aria-labelledby"]} className="mb-2 p-0 text-label text-ink">
        {label}
        {optionalLabel ? <span className="font-normal text-ink-muted"> ({optionalLabel})</span> : null}
      </legend>
      {hint && hintId ? (
        <FieldMessage id={hintId} kind="hint">
          {hint}
        </FieldMessage>
      ) : null}
      {typeof children === "function" ? children(control) : children}
      {error && errorId ? (
        <FieldMessage id={errorId} kind="error">
          {error}
        </FieldMessage>
      ) : null}
    </fieldset>
  );
}
