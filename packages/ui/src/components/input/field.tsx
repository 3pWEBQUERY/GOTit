"use client";

import { createContext, useContext, useId, useMemo, type ReactNode } from "react";
import { cn } from "../../cn";
import { FieldMessage } from "./field-message";

/** Attribute, die das Bedienelement eines Felds tragen muss. Direkt spreizbar. */
export interface FieldControl {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
}

/** IDs der Teile eines Felds, für Bedienelemente, die kein `<label for>` nutzen können. */
export interface FieldParts {
  labelId: string;
  hintId: string | undefined;
  errorId: string | undefined;
}

interface FieldContextValue {
  control: FieldControl;
  parts: FieldParts;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Liefert die Attribute für das Bedienelement innerhalb von `Field`
 * (Alternative zur Render-Prop). Ausserhalb eines `Field` ist das Ergebnis `null`.
 */
export function useFieldControl(): FieldControl | null {
  return useContext(FieldContext)?.control ?? null;
}

export interface FieldProps {
  label: ReactNode;
  /** Format-Hinweis unter dem Feld. */
  hint?: ReactNode;
  /** Fehlermeldung am Feld. Setzt `aria-invalid` am Bedienelement. */
  error?: ReactNode;
  /** Kennzeichnet ein optionales Feld, zum Beispiel «optional». Pflicht ist der Normalfall und bleibt unmarkiert. */
  optionalLabel?: string;
  /** Label nur für Screenreader. */
  hideLabel?: boolean;
  /** ID des Bedienelements. Ohne Angabe wird eine erzeugt. */
  id?: string;
  /** `span` statt `label`, wenn das Bedienelement kein beschriftbares Element ist (dann `parts.labelId` verwenden). */
  labelElement?: "label" | "span";
  /** Zusätzliche IDs für `aria-describedby`, zum Beispiel ein Zeichenzähler. */
  describedBy?: string;
  className?: string;
  children: ReactNode | ((control: FieldControl, parts: FieldParts) => ReactNode);
}

/**
 * Gemeinsamer Rahmen aller Felder (PRD 13, Formulare): Label über dem Feld,
 * Hinweis darunter, Fehler am Feld mit Icon und Text.
 */
export function Field({ label, hint, error, optionalLabel, hideLabel, id, labelElement = "label", describedBy, className, children }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hasHint = hint !== undefined && hint !== null && hint !== false && hint !== "";
  const hasError = error !== undefined && error !== null && error !== false && error !== "";

  const value = useMemo<FieldContextValue>(() => {
    const hintId = hasHint ? `${controlId}-hint` : undefined;
    const errorId = hasError ? `${controlId}-error` : undefined;
    const describedIds = [errorId, hintId, describedBy].filter(Boolean).join(" ");
    return {
      control: { id: controlId, "aria-describedby": describedIds || undefined, "aria-invalid": hasError ? true : undefined },
      parts: { labelId: `${controlId}-label`, hintId, errorId },
    };
  }, [controlId, hasHint, hasError, describedBy]);

  const labelContent = (
    <>
      {label}
      {optionalLabel ? <span className="font-normal text-ink-muted"> ({optionalLabel})</span> : null}
    </>
  );
  const labelClass = cn("text-label text-ink", hideLabel && "sr-only");

  return (
    <FieldContext.Provider value={value}>
      <div className={cn("flex min-w-0 flex-col gap-2", className)}>
        {labelElement === "label" ? (
          <label id={value.parts.labelId} htmlFor={controlId} className={labelClass}>
            {labelContent}
          </label>
        ) : (
          <span id={value.parts.labelId} className={labelClass}>
            {labelContent}
          </span>
        )}
        {typeof children === "function" ? children(value.control, value.parts) : children}
        {hasError && value.parts.errorId ? (
          <FieldMessage id={value.parts.errorId} kind="error">
            {error}
          </FieldMessage>
        ) : null}
        {hasHint && value.parts.hintId ? (
          <FieldMessage id={value.parts.hintId} kind="hint">
            {hint}
          </FieldMessage>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}
