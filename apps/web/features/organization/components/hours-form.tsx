"use client";

import {
  AvailabilityEditor,
  Button,
  isAvailabilityValid,
  type AvailabilityValue,
  type Weekday,
} from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useFieldLabels } from "../../booking/studio/lib/use-labels";
import { valueToWindows } from "../../booking/studio/lib/windows";
import { saveHoursAction } from "../actions/locations";

const DAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Öffnungszeiten pro Wochentag mit mehreren Fenstern (v2 12.2); Speichern-Button, Fehler am Feld (PRD 13). */
export function HoursForm({
  slug,
  locationId,
  initial,
  canEdit,
}: {
  slug: string;
  locationId: string;
  initial: AvailabilityValue;
  canEdit: boolean;
}) {
  const t = useTranslations("organization.hours");
  const tDays = useTranslations("bookingStudio.availability.days");
  const labels = useFieldLabels();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "invalid" | "failed"
  >("idle");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (!isAvailabilityValid(value)) {
      setStatus("invalid");
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>("[aria-invalid=true]")
          ?.focus(),
      );
      return;
    }
    setStatus("saving");
    const result = await saveHoursAction(
      slug,
      locationId,
      valueToWindows(value),
    ).catch(() => ({ ok: false as const }));
    setStatus(result.ok ? "saved" : "failed");
    if (result.ok) router.refresh();
  }

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(event) => void save(event)}
      className="flex flex-col gap-4"
      data-hours-form
    >
      <AvailabilityEditor
        value={value}
        onValueChange={(next) => {
          setValue(next);
          if (status === "saved") setStatus("idle");
        }}
        dayLabels={
          Object.fromEntries(DAYS.map((day) => [day, tDays(day)])) as Record<
            Weekday,
            string
          >
        }
        labels={{
          available: (day) => t("open", { day }),
          unavailable: t("closed"),
          from: t("from"),
          to: t("to"),
          window: (day, position) => t("window", { day, position }),
          addWindow: t("addWindow"),
          removeWindow: t("removeWindow"),
          errors: {
            endBeforeStart: t("endBeforeStart"),
            overlap: t("overlap"),
            incomplete: t("incomplete"),
          },
          timeField: labels.time,
        }}
        defaultWindow={{ from: "18:00", to: "23:00" }}
        placeholder={labels.placeholderTime}
        showAllErrors={attempted}
        disabled={!canEdit || status === "saving"}
      />
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" loading={status === "saving"}>
            {t("save")}
          </Button>
          <p
            role="status"
            className={
              status === "invalid" || status === "failed"
                ? "text-small text-error"
                : "text-small text-ink-muted"
            }
          >
            {status === "saved"
              ? t("saved")
              : status === "invalid"
                ? t("invalid")
                : status === "failed"
                  ? t("failed")
                  : ""}
          </p>
        </div>
      ) : null}
    </form>
  );
}
