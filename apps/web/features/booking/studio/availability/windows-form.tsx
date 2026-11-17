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
import { saveWindowsAction } from "../actions/calendar";
import { useFieldLabels } from "../lib/use-labels";
import { valueToWindows } from "../lib/windows";

const DAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Arbeitszeiten als wiederkehrende Fenster (v1 FR-BOOKING-001), mit Speichern-Button und Fehlern am Feld. */
export function WindowsForm({ initial }: { initial: AvailabilityValue }) {
  const t = useTranslations("bookingStudio.availability");
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
    const result = await saveWindowsAction(valueToWindows(value)).catch(() => ({
      ok: false as const,
      reason: "failed" as const,
    }));
    setStatus(
      result.ok ? "saved" : result.reason === "invalid" ? "invalid" : "failed",
    );
    if (result.ok) router.refresh();
  }

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(event) => void save(event)}
      className="flex flex-col gap-4"
      data-windows-form
    >
      <AvailabilityEditor
        value={value}
        onValueChange={(next) => {
          setValue(next);
          if (status === "saved") setStatus("idle");
        }}
        dayLabels={
          Object.fromEntries(
            DAYS.map((day) => [day, t(`days.${day}`)]),
          ) as Record<Weekday, string>
        }
        labels={{
          available: (day) => t("editor.available", { day }),
          unavailable: t("editor.unavailable"),
          from: t("editor.from"),
          to: t("editor.to"),
          window: (day, position) => t("editor.window", { day, position }),
          addWindow: t("editor.addWindow"),
          removeWindow: t("editor.removeWindow"),
          errors: {
            endBeforeStart: t("editor.endBeforeStart"),
            overlap: t("editor.overlap"),
            incomplete: t("editor.incomplete"),
          },
          timeField: { invalidFormat: t("editor.invalidTime") },
        }}
        placeholder={labels.placeholderTime}
        showAllErrors={attempted}
        disabled={status === "saving"}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={status === "saving"}>
          {t("saveWindows")}
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
            ? t("windowsSaved")
            : status === "invalid"
              ? t("windowsInvalid")
              : status === "failed"
                ? t("saveFailed")
                : ""}
        </p>
      </div>
    </form>
  );
}
