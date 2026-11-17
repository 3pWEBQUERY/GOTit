"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "../../cn";
import { DateField, type DateFieldLabels } from "../input/date-field";

export type RangePreset = "1d" | "7d" | "30d" | "90d";

/** Voreinstellung oder eigener Zeitraum. `from` und `to` sind `YYYY-MM-DD`; leer heisst «noch nicht gewählt». */
export type RangeValue = { preset: RangePreset } | { preset: "custom"; from: string; to: string };

export interface RangePickerLabels {
  /** Zugänglicher Name der Auswahl, zum Beispiel «Zeitraum». */
  group: string;
  /** «Heute» (PRD v1 7.2). */
  "1d": string;
  "7d": string;
  "30d": string;
  "90d": string;
  /** Zum Beispiel «Eigener Zeitraum». */
  custom: string;
  /** Label des ersten Datumsfelds, zum Beispiel «Von». */
  from: string;
  /** Label des zweiten Datumsfelds, zum Beispiel «Bis». */
  to: string;
  /** Texte der beiden Datumsfelder. */
  date: DateFieldLabels;
}

export interface RangePickerProps {
  value: RangeValue;
  onValueChange: (value: RangeValue) => void;
  labels: RangePickerLabels;
  /** Sprache des Kalenders, zum Beispiel `de-CH`. */
  locale: string;
  /** Zeitraum, mit dem «Eigener Zeitraum» startet. Ohne Angabe sind beide Felder leer. */
  customDefault?: { from: string; to: string };
  /** Frühestes und spätestes wählbares Datum als `YYYY-MM-DD`. */
  min?: string;
  max?: string;
  /** Heutiges Datum als `YYYY-MM-DD` für den Kalender. */
  today?: string;
  /** Format-Hinweis unter den Datumsfeldern, zum Beispiel «Format: TT.MM.JJJJ». */
  dateHint?: string;
  className?: string;
}

const PRESETS = ["1d", "7d", "30d", "90d", "custom"] as const;

function isPreset(value: string): value is (typeof PRESETS)[number] {
  return (PRESETS as readonly string[]).includes(value);
}

/**
 * Zeitraumwahl der Statistik: 7, 30 oder 90 Tage oder ein eigener Zeitraum mit
 * zwei Datumsfeldern. «Von» kann nicht nach «Bis» liegen.
 */
export function RangePicker({ value, onValueChange, labels, locale, customDefault, min, max, today, dateHint, className }: RangePickerProps) {
  function selectPreset(next: string) {
    // Radix meldet beim erneuten Klick auf die aktive Wahl einen leeren Wert; die Wahl bleibt dann stehen.
    if (!isPreset(next) || next === value.preset) return;
    if (next === "custom") onValueChange({ preset: "custom", from: customDefault?.from ?? "", to: customDefault?.to ?? "" });
    else onValueChange({ preset: next });
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      <ToggleGroupPrimitive.Root
        type="single"
        aria-label={labels.group}
        value={value.preset}
        onValueChange={selectPreset}
        className="flex w-fit max-w-full flex-wrap gap-1 rounded-control border border-border-strong bg-surface p-1"
      >
        {PRESETS.map((preset) => (
          <ToggleGroupPrimitive.Item
            key={preset}
            value={preset}
            className={cn(
              "min-h-11 rounded-chip px-3 text-small font-[550] text-ink transition-colors duration-state md:min-h-10",
              "hover:bg-surface-2 data-[state=on]:bg-ink data-[state=on]:text-bg",
            )}
          >
            {labels[preset]}
          </ToggleGroupPrimitive.Item>
        ))}
      </ToggleGroupPrimitive.Root>
      {value.preset === "custom" ? (
        <div className="grid max-w-panel grid-cols-1 gap-4 xs:grid-cols-2">
          <DateField
            label={labels.from}
            locale={locale}
            labels={labels.date}
            hint={dateHint}
            value={value.from || null}
            min={min}
            max={value.to || max}
            today={today}
            onValueChange={(from) => onValueChange({ preset: "custom", from: from ?? "", to: value.to })}
          />
          <DateField
            label={labels.to}
            locale={locale}
            labels={labels.date}
            hint={dateHint}
            value={value.to || null}
            min={value.from || min}
            max={max}
            today={today}
            onValueChange={(to) => onValueChange({ preset: "custom", from: value.from, to: to ?? "" })}
          />
        </div>
      ) : null}
    </div>
  );
}
