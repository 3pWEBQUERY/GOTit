"use client";

import { DURATIONS } from "@app/core/booking/schemas";
import type { DateFieldLabels, SelectOption, TimeFieldLabels } from "@app/ui";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

/** Texte der Datums- und Zeitfelder im Studio. */
export function useFieldLabels(): {
  date: DateFieldLabels;
  time: TimeFieldLabels;
  placeholderTime: string;
} {
  const t = useTranslations("bookingStudio.fields");
  return useMemo(
    () => ({
      date: {
        openCalendar: t("openCalendar"),
        previousMonth: t("previousMonth"),
        nextMonth: t("nextMonth"),
        invalidFormat: t("invalidDate"),
      },
      time: { invalidFormat: t("invalidTime") },
      placeholderTime: t("placeholderTime"),
    }),
    [t],
  );
}

/** Dauer als «1 Std. 30 Min.». */
export function useDurationText(): (minutes: number) => string {
  const t = useTranslations("bookingStudio.duration");
  return (minutes) => {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return [
      hours > 0 ? t("hours", { count: hours }) : "",
      rest > 0 ? t("minutes", { count: rest }) : "",
    ]
      .filter(Boolean)
      .join(" ");
  };
}

/** Wählbare Dauern eines Gegenvorschlags (Entscheid 0016: 30 Minuten bis 12 Stunden). */
export function useDurationOptions(): SelectOption[] {
  const text = useDurationText();
  return DURATIONS.map((minutes) => ({
    value: String(minutes),
    label: text(minutes),
  }));
}
