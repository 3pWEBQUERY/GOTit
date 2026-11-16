"use client";

import { Clock } from "lucide-react";
import { useState, type FocusEventHandler, type ReactNode, type Ref } from "react";
import { ControlFrame, controlInputClass } from "./control-frame";
import { Field } from "./field";
import { Select } from "./select";
import { isOnStep, parseTime } from "./time-parsing";

export interface TimeFieldLabels {
  /** Fehlermeldung, wenn die Eingabe keine Uhrzeit in der Form `HH:MM` ist. */
  invalidFormat: string;
  /** Fehlermeldung, wenn die Zeit nicht auf dem Raster von `step` liegt. Ohne Angabe gilt `invalidFormat`. */
  notOnStep?: string;
}

export interface TimeFieldProps {
  label: ReactNode;
  labels: TimeFieldLabels;
  /** Uhrzeit als `HH:MM` (24 Stunden), `null` für leer. */
  value?: string | null;
  defaultValue?: string;
  /** Meldet jede gültige Eingabe und `null`, solange der Text keine erlaubte Uhrzeit ist. */
  onValueChange?: (value: string | null) => void;
  /** Raster in Minuten, zum Beispiel 15. */
  step?: number;
  /** Erlaubte Zeiten als `HH:MM`. Mit dieser Liste wird das Feld zur Auswahl. */
  options?: readonly string[];
  name?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  hideLabel?: boolean;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  onBlur?: FocusEventHandler<HTMLElement>;
  /** Zeigt auf das Eingabefeld oder, mit `options`, auf den Auslöser der Auswahl. */
  ref?: Ref<HTMLInputElement | HTMLButtonElement>;
  className?: string;
}

/**
 * Uhrzeit im 24-Stunden-Format. Freie Eingabe wird beim Verlassen des Felds geprüft
 * und auf `HH:MM` gebracht; mit `options` wählt man aus einer Liste erlaubter Zeiten.
 */
export function TimeField({ label, labels, value: valueProp, defaultValue, onValueChange, step, options, name, hint, error: errorProp, optionalLabel, hideLabel, placeholder, disabled, readOnly, id, onBlur, ref, className }: TimeFieldProps) {
  const controlled = valueProp !== undefined;
  const [ownValue, setOwnValue] = useState<string | null>(defaultValue ?? null);
  const value = controlled ? (valueProp ?? null) : ownValue;
  const [draft, setDraft] = useState<string | null>(null);
  const [ownError, setOwnError] = useState<string | null>(null);
  const [seenValue, setSeenValue] = useState(value);

  // Ändert die App den Wert von aussen, ersetzt er die angefangene Eingabe.
  if (seenValue !== value) {
    setSeenValue(value);
    if (value !== null) {
      setDraft(null);
      setOwnError(null);
    }
  }

  const update = (next: string | null) => {
    setOwnValue(next);
    setSeenValue(next);
    if (next !== value) onValueChange?.(next);
  };
  const error = errorProp ?? ownError;
  const shared = { label, hint, error, optionalLabel, hideLabel, id, className };

  if (options) {
    return (
      <Select
        {...shared}
        ref={ref as Ref<HTMLButtonElement> | undefined}
        options={options.map((time) => ({ value: time, label: time }))}
        placeholder={placeholder}
        value={value ?? ""}
        onValueChange={update}
        name={name}
        disabled={disabled || readOnly}
        onBlur={onBlur}
      />
    );
  }

  const check = (text: string): { time: string | null; reason: string | null } => {
    if (text.trim() === "") return { time: null, reason: null };
    const time = parseTime(text);
    if (!time) return { time: null, reason: labels.invalidFormat };
    return isOnStep(time, step) ? { time, reason: null } : { time: null, reason: labels.notOnStep ?? labels.invalidFormat };
  };

  return (
    <Field {...shared}>
      {(control) => (
        <ControlFrame invalid={Boolean(error)} disabled={disabled} readOnly={readOnly} prefix={<Clock aria-hidden strokeWidth={1.5} />}>
          <input
            {...control}
            ref={ref as Ref<HTMLInputElement> | undefined}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            name={name}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            value={draft ?? value ?? ""}
            onChange={(event) => {
              setDraft(event.currentTarget.value);
              update(check(event.currentTarget.value).time);
            }}
            onBlur={(event) => {
              if (draft !== null) {
                const result = check(draft);
                setOwnError(result.reason);
                if (result.reason === null) setDraft(null);
              }
              onBlur?.(event);
            }}
            className={`${controlInputClass} tabular`}
          />
        </ControlFrame>
      )}
    </Field>
  );
}
