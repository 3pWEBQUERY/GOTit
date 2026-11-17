"use client";

import type { CalendarSettingsInput } from "@app/core/booking/schemas";
import { Button, Select, Switch, useToast, type SwitchStatus } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveSettingsAction, setExclusiveAction } from "../actions/calendar";

/** Zeitzonen zur Auswahl: der Raum, in dem die Plattform arbeitet, und UTC (Entscheid 0016, Oberfläche Studio). */
export const TIME_ZONES = [
  "Europe/Zurich",
  "Europe/Berlin",
  "Europe/Vienna",
  "Europe/Paris",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/London",
  "Europe/Lisbon",
  "UTC",
] as const;
const BUFFERS = [0, 15, 30, 45, 60, 90, 120];
const TTLS = [2, 6, 12, 24, 48, 72, 168];
const NOTICES = [0, 1, 2, 4, 12, 24, 48, 72];

type Rules = Omit<CalendarSettingsInput, "exclusiveBooking">;

/** Regeln für Anfragen mit Speichern-Button: Zeitzone, Puffer, Gültigkeit und Mindestvorlauf. */
export function SettingsForm({
  settings,
}: {
  settings: CalendarSettingsInput;
}) {
  const t = useTranslations("bookingStudio.availability");
  const router = useRouter();
  const { toast } = useToast();
  const [rules, setRules] = useState<Rules>({
    timeZone: settings.timeZone,
    bufferMinutes: settings.bufferMinutes,
    requestTtlHours: settings.requestTtlHours,
    minNoticeHours: settings.minNoticeHours,
  });
  const [status, setStatus] = useState<"idle" | "saving" | "failed">("idle");
  const set = (patch: Partial<Rules>) =>
    setRules((current) => ({ ...current, ...patch }));
  const zones: string[] = (TIME_ZONES as readonly string[]).includes(
    rules.timeZone,
  )
    ? [...TIME_ZONES]
    : [rules.timeZone, ...TIME_ZONES];
  const hours = (count: number) => t("hours", { count });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    const result = await saveSettingsAction({
      ...rules,
      exclusiveBooking: settings.exclusiveBooking,
    }).catch(() => ({ ok: false }));
    if (!result.ok) {
      setStatus("failed");
      return;
    }
    setStatus("idle");
    toast({ title: t("settingsSaved"), tone: "success" });
    router.refresh();
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void save(event)}
      className="flex max-w-reading flex-col gap-4"
      data-settings-form
    >
      <Select
        label={t("timeZone")}
        hint={t("timeZoneHint")}
        value={rules.timeZone}
        onValueChange={(timeZone) => set({ timeZone })}
        options={zones.map((zone) => ({
          value: zone,
          label:
            zone !== "UTC" && (TIME_ZONES as readonly string[]).includes(zone)
              ? `${t(`zones.${zone}`)} (${zone})`
              : zone,
        }))}
      />
      <Select
        label={t("buffer")}
        hint={t("bufferHint")}
        value={String(rules.bufferMinutes)}
        onValueChange={(value) => set({ bufferMinutes: Number(value) })}
        options={withCurrent(BUFFERS, rules.bufferMinutes).map((value) => ({
          value: String(value),
          label: value === 0 ? t("noBuffer") : t("minutes", { count: value }),
        }))}
      />
      <Select
        label={t("ttl")}
        hint={t("ttlHint")}
        value={String(rules.requestTtlHours)}
        onValueChange={(value) => set({ requestTtlHours: Number(value) })}
        options={withCurrent(TTLS, rules.requestTtlHours).map((value) => ({
          value: String(value),
          label: hours(value),
        }))}
      />
      <Select
        label={t("notice")}
        hint={t("noticeHint")}
        value={String(rules.minNoticeHours)}
        onValueChange={(value) => set({ minNoticeHours: Number(value) })}
        options={withCurrent(NOTICES, rules.minNoticeHours).map((value) => ({
          value: String(value),
          label: value === 0 ? t("noNotice") : hours(value),
        }))}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={status === "saving"}>
          {t("saveSettings")}
        </Button>
        <p role="status" className="text-small text-error">
          {status === "failed" ? t("saveFailed") : ""}
        </p>
      </div>
    </form>
  );
}

/** Ein gespeicherter Wert ausserhalb der Liste bleibt wählbar. */
function withCurrent(values: readonly number[], current: number): number[] {
  return values.includes(current)
    ? [...values]
    : [...values, current].sort((a, b) => a - b);
}

/**
 * Exklusivbelegung als Schalter, der sofort speichert und es am Ort bestätigt
 * (PRD 13: Schalter und Speichern-Button nicht im selben Formular).
 */
export function ExclusiveSwitch({ exclusive }: { exclusive: boolean }) {
  const t = useTranslations("bookingStudio.availability");
  const router = useRouter();
  const [checked, setChecked] = useState(exclusive);
  const [status, setStatus] = useState<SwitchStatus>("idle");

  async function change(next: boolean) {
    setChecked(next);
    setStatus("saving");
    const result = await setExclusiveAction(next).catch(() => ({ ok: false }));
    if (!result.ok) {
      setChecked(!next);
      setStatus("error");
      return;
    }
    setStatus("saved");
    router.refresh();
  }

  return (
    <Switch
      label={t("exclusive")}
      description={t("exclusiveHint")}
      checked={checked}
      onCheckedChange={(next) => void change(next)}
      status={status}
      statusLabel={
        status === "saving"
          ? t("saving")
          : status === "saved"
            ? t("saved")
            : status === "error"
              ? t("savingFailed")
              : undefined
      }
      className="max-w-reading"
    />
  );
}
