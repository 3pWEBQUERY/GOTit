"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "../../cn";
import { Button } from "../actions/button";
import { IconButton } from "../actions/icon-button";
import { Select, type SelectOption } from "../input/select";
import { Switch } from "../input/switch";
import { TimeField, type TimeFieldLabels } from "../input/time-field";
import { suggestWindow, validateWindows, WEEKDAYS, type AvailabilityIssue, type AvailabilityValue, type AvailabilityWindow, type Weekday } from "./availability-validation";

export interface AvailabilityEditorLabels {
  /** Beschriftung des Schalters je Tag, zum Beispiel `(day) => `${day} verfügbar``. */
  available: (dayLabel: string) => string;
  /** Text unter einem ausgeschalteten Tag, zum Beispiel «Nicht verfügbar». */
  unavailable: string;
  from: string;
  to: string;
  /** Zugänglicher Name eines Zeitfensters, zum Beispiel «Montag, Zeitfenster 2». */
  window: (dayLabel: string, position: number) => string;
  /** Zum Beispiel «Zeitfenster hinzufügen». */
  addWindow: string;
  /** Zum Beispiel «Zeitfenster entfernen». */
  removeWindow: string;
  /** Fehlertexte am Feld. `incomplete` ist optional; ohne Angabe bleibt ein leeres Fenster ohne Meldung. */
  errors: { endBeforeStart: string; overlap: string; incomplete?: string };
  timeField: TimeFieldLabels;
}

export interface AvailabilityBuffer {
  label: ReactNode;
  /** Minuten als Text, zum Beispiel `"15"`. */
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  hint?: ReactNode;
}

export interface AvailabilityEditorProps {
  value: AvailabilityValue;
  onValueChange: (value: AvailabilityValue) => void;
  /** Namen der Wochentage, zum Beispiel `{ mon: "Montag", … }`. */
  dayLabels: Record<Weekday, string>;
  labels: AvailabilityEditorLabels;
  /** Fenster, das ein Tag beim Einschalten bekommt. */
  defaultWindow?: AvailabilityWindow;
  /** Optionales Feld «Puffer zwischen Terminen». */
  buffer?: AvailabilityBuffer;
  /** Zeigt alle Fehler sofort, zum Beispiel nach einem Speicherversuch. */
  showAllErrors?: boolean;
  /** Platzhalter der Zeitfelder, zum Beispiel «HH:MM». */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_WINDOW: AvailabilityWindow = { from: "09:00", to: "17:00" };

/**
 * Arbeitszeiten pro Wochentag, Montag bis Sonntag. Geprüft wird beim Verlassen eines Felds
 * (PRD 13): bis muss später sein als von, Fenster eines Tages dürfen sich nicht überlappen.
 * Kontrolliert; ob gespeichert werden darf, sagt `isAvailabilityValid`.
 */
export function AvailabilityEditor({ value, onValueChange, dayLabels, labels, defaultWindow = DEFAULT_WINDOW, buffer, showAllErrors, placeholder, disabled, className }: AvailabilityEditorProps) {
  const [touched, setTouched] = useState<Partial<Record<Weekday, boolean>>>({});
  const setDay = (day: Weekday, windows: AvailabilityWindow[]) => onValueChange({ ...value, [day]: windows });
  const touch = (day: Weekday) => setTouched((current) => (current[day] ? current : { ...current, [day]: true }));

  const messageFor = (issue: AvailabilityIssue | null | undefined): string | undefined => (issue ? labels.errors[issue] : undefined);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <ul className="flex flex-col">
        {WEEKDAYS.map((day) => {
          const windows = value[day];
          const dayLabel = dayLabels[day];
          const issues = showAllErrors || touched[day] ? validateWindows(windows) : [];
          return (
            <li key={day} className="border-b border-border py-2 first:border-t">
              <div role="group" aria-label={dayLabel} className="flex flex-col gap-3">
                <Switch
                  label={labels.available(dayLabel)}
                  checked={windows.length > 0}
                  disabled={disabled}
                  onCheckedChange={(checked) => setDay(day, checked ? [defaultWindow] : [])}
                />
                {windows.length === 0 ? (
                  <p className="pb-3 text-small text-ink-muted">{labels.unavailable}</p>
                ) : (
                  <div className="flex flex-col gap-3 pb-3">
                    {windows.map((window, index) => {
                      const issue = issues[index];
                      const change = (patch: Partial<AvailabilityWindow>) => setDay(day, windows.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
                      return (
                        // Fenster haben keine eigene Identität; ihre Position ist ihr Schlüssel.
                        // eslint-disable-next-line react/no-array-index-key
                        <div key={index} role="group" aria-label={labels.window(dayLabel, index + 1)} className="flex items-start gap-2">
                          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 xs:grid-cols-2">
                            <TimeField
                              label={labels.from}
                              labels={labels.timeField}
                              value={window.from || null}
                              onValueChange={(next) => change({ from: next ?? "" })}
                              onBlur={() => touch(day)}
                              error={issue === "overlap" || (issue === "incomplete" && !window.from) ? messageFor(issue) : undefined}
                              placeholder={placeholder}
                              disabled={disabled}
                            />
                            <TimeField
                              label={labels.to}
                              labels={labels.timeField}
                              value={window.to || null}
                              onValueChange={(next) => change({ to: next ?? "" })}
                              onBlur={() => touch(day)}
                              error={issue === "endBeforeStart" || (issue === "incomplete" && Boolean(window.from)) ? messageFor(issue) : undefined}
                              placeholder={placeholder}
                              disabled={disabled}
                            />
                          </div>
                          <IconButton
                            label={labels.removeWindow}
                            icon={<Trash2 strokeWidth={1.5} />}
                            disabled={disabled}
                            className="mt-6"
                            onClick={() => {
                              touch(day);
                              setDay(day, windows.filter((_, itemIndex) => itemIndex !== index));
                            }}
                          />
                        </div>
                      );
                    })}
                    <div>
                      <Button variant="quiet" icon={<Plus aria-hidden strokeWidth={1.5} />} disabled={disabled} onClick={() => setDay(day, [...windows, suggestWindow(windows, defaultWindow)])}>
                        {labels.addWindow}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {buffer ? <Select label={buffer.label} options={buffer.options} value={buffer.value} onValueChange={buffer.onValueChange} hint={buffer.hint} disabled={disabled} className="max-w-panel" /> : null}
    </div>
  );
}
