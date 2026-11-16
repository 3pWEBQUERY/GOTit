"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import { useId, useState, type ReactNode } from "react";
import { cn } from "../../cn";
import { FieldMessage } from "./field-message";

interface SliderBaseProps {
  label: ReactNode;
  min: number;
  max: number;
  step?: number;
  /** Formatiert einen Wert für die Anzeige und für Screenreader, zum Beispiel «25 km» oder «CHF 300». */
  formatValue: (value: number) => string;
  hint?: ReactNode;
  name?: string;
  disabled?: boolean;
  /** Kleinster Abstand zwischen den Griffen eines Bereichs, in Schritten. */
  minStepsBetweenThumbs?: number;
  className?: string;
}

/** Ein Wert oder ein Bereich aus zwei Werten. */
export type SliderValue = number | readonly [number, number];

/** Form, in der die Callbacks den Wert melden: Zahl oder Tupel, passend zu `value`. */
export type SliderOutput<T extends SliderValue> = T extends number ? number : [number, number];

/**
 * Ein Tupel in `value` oder `defaultValue` macht den Regler zum Bereich; dann sind
 * die Namen beider Griffe Pflicht, zum Beispiel «Preis von» und «Preis bis».
 */
export type SliderProps<T extends SliderValue = number> = SliderBaseProps & {
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: SliderOutput<T>) => void;
  /** Wird beim Loslassen aufgerufen; der richtige Moment, um zu suchen oder zu speichern. */
  onValueCommit?: (value: SliderOutput<T>) => void;
} & (T extends number
    ? {
        /** Zugänglicher Name des Griffs. Ohne Angabe gilt das Label. */
        thumbLabels?: readonly [string];
      }
    : { thumbLabels: readonly [string, string] });

function toList(value: SliderValue | undefined): number[] | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? [value] : [...value];
}

const thumbClass = cn(
  "relative block size-6 rounded-full border border-border-strong bg-surface transition-colors duration-state",
  "before:absolute before:-inset-3 hover:border-ink data-disabled:cursor-not-allowed",
);

/**
 * Schieberegler für einen Wert (Umkreis) oder einen Bereich (Preis von–bis).
 * Ein Tupel in `value` oder `defaultValue` macht ihn zum Bereich. Der aktuelle Wert steht immer als Text daneben.
 */
export function Slider<T extends SliderValue = number>(props: SliderProps<T>) {
  const { label, min, max, step, formatValue, hint, name, disabled, minStepsBetweenThumbs, className, onValueChange, onValueCommit } = props;
  const thumbLabels: readonly string[] | undefined = props.thumbLabels;
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = hint ? `${id}-hint` : undefined;
  const [ownValues, setOwnValues] = useState<number[]>(() => toList(props.defaultValue) ?? [min]);
  const values = toList(props.value) ?? ownValues;
  const range = values.length > 1;

  const toOutput = (next: number[]) => (range ? [next[0] ?? min, next[1] ?? max] : (next[0] ?? min)) as SliderOutput<T>;

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={hintId} className={cn("flex min-w-0 flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span id={labelId} className="text-label text-ink">
          {label}
        </span>
        {range ? null : <output className="tabular text-small text-ink">{formatValue(values[0] ?? min)}</output>}
      </div>
      <SliderPrimitive.Root
        min={min}
        max={max}
        step={step}
        name={name}
        disabled={disabled}
        minStepsBetweenThumbs={minStepsBetweenThumbs}
        value={values}
        onValueChange={(next) => {
          setOwnValues(next);
          onValueChange?.(toOutput(next));
        }}
        onValueCommit={(next) => onValueCommit?.(toOutput(next))}
        className="relative flex h-11 touch-none items-center select-none data-disabled:opacity-55"
      >
        <SliderPrimitive.Track className="relative h-1 grow rounded-full bg-border">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-ink" />
        </SliderPrimitive.Track>
        {values.map((value, index) => (
          <SliderPrimitive.Thumb
            // Die Reihenfolge der Griffe ist fest (von, bis); der Index ist hier die Identität.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            aria-label={thumbLabels?.[index]}
            aria-labelledby={thumbLabels?.[index] ? undefined : labelId}
            aria-valuetext={formatValue(value)}
            className={thumbClass}
          />
        ))}
      </SliderPrimitive.Root>
      {range ? (
        <div className="tabular flex justify-between gap-4 text-small text-ink">
          <output>{formatValue(values[0] ?? min)}</output>
          <output>{formatValue(values[1] ?? max)}</output>
        </div>
      ) : null}
      {hint && hintId ? (
        <FieldMessage id={hintId} kind="hint">
          {hint}
        </FieldMessage>
      ) : null}
    </div>
  );
}
