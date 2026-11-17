"use client";

import { Button, DateField, Select, TimeField } from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { counterProposalAction, type CounterResult } from "../actions/calendar";
import { useDurationOptions, useFieldLabels } from "../lib/use-labels";
import type { RequestView } from "../queries/request-view";

type FieldError = { day?: string; time?: string };

/**
 * Gegenvorschlag mit Tag, Beginn und Dauer in der Zone des Anbieters. Der
 * Anbieter darf jede künftige Zeit vorschlagen (Entscheid 0016); Fehler stehen
 * am Feld, die Eingaben bleiben stehen.
 */
export function CounterForm({
  request,
  onCancel,
  onDone,
}: {
  request: RequestView;
  onCancel: () => void;
  onDone: (result: Exclude<CounterResult, { reason: "past" }>) => void;
}) {
  const t = useTranslations("bookingStudio.request.counterForm");
  const tr = useTranslations("bookingStudio.request");
  const locale = useLocale();
  const labels = useFieldLabels();
  const durations = useDurationOptions();
  const [day, setDay] = useState<string | null>(request.counter.day);
  const [time, setTime] = useState<string | null>(request.counter.time);
  const [duration, setDuration] = useState(String(request.counter.duration));
  const [errors, setErrors] = useState<FieldError>({});
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing: FieldError = {
      day: day ? undefined : t("dayRequired"),
      time: time ? undefined : t("timeRequired"),
    };
    setErrors(missing);
    if (!day || !time) {
      event.currentTarget
        .querySelector<HTMLElement>("[aria-invalid=true]")
        ?.focus();
      return;
    }
    setPending(true);
    const result = await counterProposalAction(request.id, {
      day,
      time,
      durationMinutes: Number(duration),
    }).catch((): CounterResult => ({ ok: false, reason: "invalid" }));
    setPending(false);
    if (!result.ok && result.reason === "past") {
      setErrors({ time: t("past") });
      return;
    }
    onDone(result);
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4"
      data-counter-form
    >
      <p className="text-small text-ink-muted">{t("hint")}</p>
      <div className="grid gap-4 xs:grid-cols-2">
        <DateField
          label={t("day")}
          locale={`${locale}-CH`}
          labels={labels.date}
          value={day}
          onValueChange={setDay}
          error={errors.day}
          className="xs:col-span-2"
        />
        <TimeField
          label={t("time")}
          labels={labels.time}
          value={time}
          onValueChange={setTime}
          error={errors.time}
          placeholder={labels.placeholderTime}
        />
        <Select
          label={t("duration")}
          options={durations}
          value={duration}
          onValueChange={setDuration}
        />
      </div>
      <div className="flex flex-col-reverse gap-2 xs:flex-row xs:justify-end">
        <Button disabled={pending} onClick={onCancel}>
          {tr("abort")}
        </Button>
        <Button type="submit" variant="primary" loading={pending}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
