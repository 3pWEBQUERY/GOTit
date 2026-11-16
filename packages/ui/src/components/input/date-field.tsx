"use client";

import { Calendar } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { useRef, useState, type FocusEventHandler, type ReactNode, type Ref } from "react";
import { IconButton } from "../actions/icon-button";
import { ControlFrame, controlInputClass } from "./control-frame";
import { DateFieldCalendar } from "./date-field-calendar";
import { formatSwissDate, isWithinRange, parseSwissDate } from "./date-parsing";
import { Field } from "./field";

export interface DateFieldLabels {
  openCalendar: string;
  previousMonth: string;
  nextMonth: string;
  /** Fehlermeldung, wenn die Eingabe kein Datum in der Form `TT.MM.JJJJ` ist. */
  invalidFormat: string;
  /** Grund für Tage ausserhalb von `min` und `max`. Ohne Angabe gilt `invalidFormat`. */
  outOfRange?: string;
}

export interface DateFieldProps {
  label: ReactNode;
  /** Sprache für Monats- und Wochentagsnamen, zum Beispiel `de-CH`. */
  locale: string;
  labels: DateFieldLabels;
  /** Datum als `YYYY-MM-DD`, `null` für leer. */
  value?: string | null;
  defaultValue?: string;
  /** Meldet jede gültige Eingabe und `null`, solange der Text kein wählbares Datum ist. */
  onValueChange?: (value: string | null) => void;
  /** Frühestes und spätestes Datum als `YYYY-MM-DD`. */
  min?: string;
  max?: string;
  /** Gibt den Grund zurück, warum ein Tag nicht wählbar ist, sonst `null`. Der Grund steht am Tag und als Fehler am Feld. */
  isDateDisabled?: (iso: string) => string | null;
  /** Name des versteckten Felds, das den ISO-Wert im Formular trägt. */
  name?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  hideLabel?: boolean;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  /** Heutiges Datum als `YYYY-MM-DD` für den Kalender. Ohne Angabe gilt die Uhr des Geräts. */
  today?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  ref?: Ref<HTMLInputElement>;
  className?: string;
}

/**
 * Datum in Schweizer Schreibweise `TT.MM.JJJJ`, per Tastatur oder Kalender.
 * Geprüft wird beim Verlassen des Felds; die Eingabe bleibt auch bei einem Fehler stehen.
 */
export function DateField({ label, locale, labels, value: valueProp, defaultValue, onValueChange, min, max, isDateDisabled, name, hint, error: errorProp, optionalLabel, hideLabel, placeholder, disabled, readOnly, id, today, onBlur, ref, className }: DateFieldProps) {
  const controlled = valueProp !== undefined;
  const [ownValue, setOwnValue] = useState<string | null>(defaultValue ?? null);
  const value = controlled ? (valueProp ?? null) : ownValue;
  /** `null`: es wird nicht getippt, das Feld zeigt den Wert. */
  const [draft, setDraft] = useState<string | null>(null);
  const [ownError, setOwnError] = useState<string | null>(null);
  const [seenValue, setSeenValue] = useState(value);
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Ändert die App den Wert von aussen, ersetzt er die angefangene Eingabe.
  if (seenValue !== value) {
    setSeenValue(value);
    if (value !== null) {
      setDraft(null);
      setOwnError(null);
    }
  }

  /** Ergebnis einer Eingabe: das Datum oder der Grund, warum es nicht gilt. */
  const check = (text: string): { iso: string | null; reason: string | null } => {
    if (text.trim() === "") return { iso: null, reason: null };
    const iso = parseSwissDate(text);
    if (!iso) return { iso: null, reason: labels.invalidFormat };
    if (!isWithinRange(iso, min, max)) return { iso: null, reason: labels.outOfRange ?? labels.invalidFormat };
    const reason = isDateDisabled?.(iso) ?? null;
    return reason === null ? { iso, reason: null } : { iso: null, reason };
  };
  const update = (next: string | null) => {
    setOwnValue(next);
    setSeenValue(next);
    if (next !== value) onValueChange?.(next);
  };
  const handleBlur: FocusEventHandler<HTMLInputElement> = (event) => {
    if (draft !== null) {
      const result = check(draft);
      setOwnError(result.reason);
      if (result.reason === null) setDraft(null);
    }
    onBlur?.(event);
  };
  const error = errorProp ?? ownError;

  return (
    <Field label={label} hint={hint} error={error} optionalLabel={optionalLabel} hideLabel={hideLabel} id={id} className={className}>
      {(control) => (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
          <PopoverPrimitive.Anchor asChild>
            <ControlFrame
              invalid={Boolean(error)}
              disabled={disabled}
              readOnly={readOnly}
              suffix={
                <PopoverPrimitive.Trigger asChild>
                  <IconButton label={labels.openCalendar} icon={<Calendar strokeWidth={1.5} />} disabled={disabled || readOnly} className="-my-px text-ink" />
                </PopoverPrimitive.Trigger>
              }
            >
              <input
                {...control}
                ref={ref}
                type="text"
                autoComplete="off"
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnly}
                value={draft ?? formatSwissDate(value)}
                onChange={(event) => {
                  setDraft(event.currentTarget.value);
                  update(check(event.currentTarget.value).iso);
                }}
                onBlur={handleBlur}
                className={controlInputClass}
              />
            </ControlFrame>
          </PopoverPrimitive.Anchor>
          {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              ref={contentRef}
              align="start"
              sideOffset={4}
              aria-label={labels.openCalendar}
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                contentRef.current?.querySelector<HTMLElement>('[data-date][tabindex="0"]')?.focus();
              }}
              className="z-50 animate-layer-in rounded-control border border-border bg-surface p-1 shadow-raised"
            >
              <DateFieldCalendar
                value={value}
                min={min}
                max={max}
                isDateDisabled={isDateDisabled}
                locale={locale}
                labels={labels}
                today={today}
                onSelect={(iso) => {
                  setDraft(null);
                  setOwnError(null);
                  update(iso);
                  setOpen(false);
                }}
              />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      )}
    </Field>
  );
}
