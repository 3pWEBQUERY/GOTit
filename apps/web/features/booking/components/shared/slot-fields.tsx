"use client";

import { Select } from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { formatDay } from "../../lib/format";
import {
  fittingDurations,
  findStart,
  keepDuration,
  type DayOption,
} from "../../lib/slot-options";
import { useBookingFormat } from "./use-booking-format";

export interface SlotValue {
  day: string | null;
  time: string | null;
  duration: number | null;
}

export interface SlotFieldsProps {
  days: readonly DayOption[];
  timeZone: string;
  value: SlotValue;
  onChange: (value: SlotValue) => void;
  /** Fehler an Tag, Uhrzeit oder Dauer. */
  errors: Partial<Record<keyof SlotValue, string>>;
  idPrefix: string;
}

/**
 * Tag, Uhrzeit und Dauer aus den freien Zeiten (v2 10.2): Es gibt nur Tage
 * mit Verfügbarkeit, nur Startzeiten in freien Fenstern und nur Dauern, die
 * vollständig frei sind. Ändert sich die Uhrzeit, bleibt die Dauer, wenn sie
 * noch passt.
 */
export function SlotFields({
  days,
  timeZone,
  value,
  onChange,
  errors,
  idPrefix,
}: SlotFieldsProps) {
  const t = useTranslations("booking.form");
  const locale = useLocale();
  const format = useBookingFormat(timeZone);
  const day = days.find((entry) => entry.day === value.day);
  const start = findStart(days, value.day, value.time);
  const durations = useMemo(() => fittingDurations(start), [start]);
  const zoneHint = format.zone
    ? t("zoneHint", { zone: format.zone })
    : undefined;

  return (
    <>
      <Select
        id={`${idPrefix}-tag`}
        label={t("day")}
        placeholder={t("dayPlaceholder")}
        hint={t("dayHint")}
        error={errors.day}
        value={value.day ?? ""}
        onValueChange={(next) => {
          const nextDay = days.find((entry) => entry.day === next);
          const time = nextDay?.times.some((entry) => entry.time === value.time)
            ? value.time
            : null;
          const nextStart = findStart(days, next, time);
          onChange({
            day: next,
            time,
            duration: nextStart
              ? keepDuration(value.duration, fittingDurations(nextStart))
              : value.duration,
          });
        }}
        options={days.map((entry) => ({
          value: entry.day,
          label: formatDay(
            entry.times[0]?.startsAt ?? `${entry.day}T12:00:00Z`,
            timeZone,
            locale,
          ),
        }))}
      />
      <Select
        id={`${idPrefix}-zeit`}
        label={t("time")}
        placeholder={day ? t("timePlaceholder") : t("timeNeedsDay")}
        hint={zoneHint}
        error={errors.time}
        value={value.time ?? ""}
        disabled={!day}
        onValueChange={(next) =>
          onChange({
            ...value,
            time: next,
            duration: keepDuration(
              value.duration,
              fittingDurations(findStart(days, value.day, next)),
            ),
          })
        }
        options={(day?.times ?? []).map((entry) => ({
          value: entry.time,
          label: entry.time,
        }))}
      />
      <Select
        id={`${idPrefix}-dauer`}
        label={t("duration")}
        placeholder={start ? t("durationPlaceholder") : t("durationNeedsTime")}
        hint={
          start
            ? t("durationHint", { until: format.duration(start.maxMinutes) })
            : undefined
        }
        error={errors.duration}
        value={value.duration ? String(value.duration) : ""}
        disabled={!start}
        onValueChange={(next) => onChange({ ...value, duration: Number(next) })}
        options={durations.map((minutes) => ({
          value: String(minutes),
          label: format.duration(minutes),
        }))}
      />
    </>
  );
}
