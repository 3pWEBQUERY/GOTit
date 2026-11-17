"use client";

import { RangePicker, type RangePickerLabels, type RangeValue } from "@app/ui";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { isIsoDay, rangeQuery, type StatsPreset } from "../lib/range-params";

export interface RangeControlProps {
  value: RangeValue;
  labels: RangePickerLabels;
  locale: string;
  today: string;
  dateHint: string;
  /** Ab diesem Tag ist «Bis» höchstens heute; «Von» liegt nie davor. */
  min: string;
  fallback: StatsPreset;
  /** Startwerte von «Eigener Zeitraum», meist der gezeigte Zeitraum. */
  customDefault: { from: string; to: string };
}

/**
 * Zeitraumwahl der Statistik (PRD v2 11.6). Der Zeitraum steht in der URL;
 * ein eigener Zeitraum wird geladen, sobald beide Tage gültig sind.
 */
export function RangeControl({
  value: initial,
  labels,
  locale,
  today,
  dateHint,
  min,
  fallback,
  customDefault,
}: RangeControlProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  function change(next: RangeValue) {
    setValue(next);
    if (
      next.preset === "custom" &&
      !(isIsoDay(next.from) && isIsoDay(next.to) && next.from <= next.to)
    )
      return;
    const query = new URLSearchParams(rangeQuery(next, fallback)).toString();
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      }),
    );
  }

  return (
    <div data-range-control aria-busy={pending || undefined}>
      <RangePicker
        value={value}
        onValueChange={change}
        labels={labels}
        locale={`${locale}-CH`}
        customDefault={customDefault}
        min={min}
        max={today}
        today={today}
        dateHint={dateHint}
      />
    </div>
  );
}
