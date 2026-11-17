"use client";

import { DURATIONS } from "@app/core/booking/schemas";
import {
  Button,
  DateField,
  Dialog,
  DialogContent,
  InlineAlert,
  Select,
  TimeField,
} from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type FormEvent } from "react";
import { slotDays } from "../../lib/slot-options";
import type { ClientBooking, ClientSlots } from "../../lib/types";
import { SlotFields, type SlotValue } from "./slot-fields";
import { useBookingFormat } from "./use-booking-format";
import type { LocalCounter } from "./use-booking-action";

export interface CounterDialogProps {
  booking: ClientBooking;
  /** Mitglied: nur freie Zeiten. Anbieter: `null`, freie Eingabe in der eigenen Zone. */
  slots: ClientSlots | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mitglied: Beginn als ISO. Gibt `true` zurück, wenn der Vorschlag gesendet ist. */
  onSlot: (startsAt: string, durationMinutes: number) => Promise<boolean>;
  onLocal: (input: LocalCounter) => Promise<boolean>;
  busy: boolean;
  failure: string | null;
}

function zonedNow(
  timeZone: string,
  iso: string,
): { day: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

function addDaysIso(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, date + days))
    .toISOString()
    .slice(0, 10);
}

/**
 * Gegenvorschlag (v1 FR-BOOKING-004) als kurzer Dialog. Das Mitglied wählt
 * aus den freien Zeiten; der Anbieter kennt seinen Kalender und gibt Tag und
 * Uhrzeit frei ein (Entscheid 0016). Fehler stehen am Feld.
 */
export function CounterDialog({
  booking,
  slots,
  open,
  onOpenChange,
  onSlot,
  onLocal,
  busy,
  failure,
}: CounterDialogProps) {
  const t = useTranslations("booking.counter");
  const tForm = useTranslations("booking.form");
  const locale = useLocale();
  const format = useBookingFormat(booking.timeZone);
  const days = useMemo(
    () => (slots ? slotDays(slots.slots, slots.timeZone) : []),
    [slots],
  );
  const current = zonedNow(booking.timeZone, booking.startsAt);
  const currentMinutes = Math.round(
    (Date.parse(booking.endsAt) - Date.parse(booking.startsAt)) / 60_000,
  );
  const [slot, setSlot] = useState<SlotValue>({
    day: null,
    time: null,
    duration: null,
  });
  const [day, setDay] = useState<string | null>(current.day);
  const [time, setTime] = useState<string | null>(current.time);
  const [duration, setDuration] = useState<number>(
    (DURATIONS as readonly number[]).includes(currentMinutes)
      ? currentMinutes
      : 60,
  );
  const [errors, setErrors] = useState<
    Partial<Record<"day" | "time" | "duration", string>>
  >({});
  const today = zonedNow(booking.timeZone, new Date().toISOString()).day;
  const member = booking.role === "MEMBER";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (member) {
      if (!slot.day) next.day = tForm("errors.dayMissing");
      if (!slot.time) next.time = tForm("errors.timeMissing");
      if (!slot.duration) next.duration = tForm("errors.durationMissing");
    } else {
      if (!day) next.day = tForm("errors.dayMissing");
      if (!time) next.time = tForm("errors.timeMissing");
    }
    setErrors(next);
    const first = (["day", "time", "duration"] as const).find(
      (key) => next[key],
    );
    if (first) {
      document
        .getElementById(
          `gegenvorschlag-${first === "day" ? "tag" : first === "time" ? "zeit" : "dauer"}`,
        )
        ?.focus();
      return;
    }
    const sent = member
      ? await onSlot(
          days
            .find((entry) => entry.day === slot.day)
            ?.times.find((entry) => entry.time === slot.time)?.startsAt ?? "",
          slot.duration ?? 0,
        )
      : await onLocal({
          day: day ?? "",
          time: time ?? "",
          durationMinutes: duration,
        });
    if (sent) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t("title")}
        description={t(member ? "descriptionMember" : "descriptionProvider", {
          name: booking.counterpartName,
        })}
        closeLabel={t("close")}
      >
        <form noValidate onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <p className="text-small text-ink-muted">
            {t("current", {
              when: format.range(booking.startsAt, booking.endsAt),
            })}
          </p>
          {member ? (
            days.length === 0 ? (
              <InlineAlert tone="info" title={t("noSlots")} />
            ) : (
              <SlotFields
                days={days}
                timeZone={booking.timeZone}
                value={slot}
                onChange={setSlot}
                errors={errors}
                idPrefix="gegenvorschlag"
              />
            )
          ) : (
            <>
              <DateField
                id="gegenvorschlag-tag"
                label={tForm("day")}
                locale={`${locale}-CH`}
                today={today}
                min={today}
                max={addDaysIso(today, 90)}
                value={day}
                onValueChange={setDay}
                error={errors.day}
                hint={tForm("dateHint")}
                labels={{
                  openCalendar: t("openCalendar"),
                  previousMonth: t("previousMonth"),
                  nextMonth: t("nextMonth"),
                  invalidFormat: t("invalidDate"),
                  outOfRange: t("outOfRange"),
                }}
              />
              <TimeField
                id="gegenvorschlag-zeit"
                label={tForm("time")}
                step={15}
                value={time}
                onValueChange={setTime}
                error={errors.time}
                hint={
                  format.zone
                    ? tForm("zoneHint", { zone: format.zone })
                    : tForm("timeHint")
                }
                labels={{
                  invalidFormat: t("invalidTime"),
                  notOnStep: t("notOnStep"),
                }}
              />
              <Select
                id="gegenvorschlag-dauer"
                label={tForm("duration")}
                value={String(duration)}
                onValueChange={(value) => setDuration(Number(value))}
                options={DURATIONS.map((minutes) => ({
                  value: String(minutes),
                  label: format.duration(minutes),
                }))}
              />
            </>
          )}
          {failure ? (
            <p role="alert" className="text-small text-error">
              {failure}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 xs:flex-row xs:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            {member && days.length === 0 ? null : (
              <Button type="submit" variant="primary" loading={busy}>
                {t("submit")}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
