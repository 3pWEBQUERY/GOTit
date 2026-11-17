"use client";

import { MESSAGE_MAX } from "@app/core/booking/schemas";
import { Button, InlineAlert, Select, TextArea } from "@app/ui";
import { useTranslations } from "next-intl";
import type { FormEvent } from "react";
import { SlotFields } from "../shared/slot-fields";
import { FIELD_IDS, type useRequestForm } from "./use-request-form";

export interface RequestFormProps {
  form: ReturnType<typeof useRequestForm>;
  name: string;
  timeZone: string;
  regions: readonly { id: string; name: string }[];
  signedIn: boolean;
  onCancel: () => void;
}

const NO_REGION = "keine";

/**
 * Felder der Terminanfrage (v2 10.2): Tag, Uhrzeit, Dauer, Region, Nachricht.
 * Pflicht ist der Normalfall, Region und Nachricht sind als «optional»
 * beschriftet. Fehler stehen am Feld und zusammengefasst oben (PRD 13).
 */
export function RequestForm({
  form,
  name,
  timeZone,
  regions,
  signedIn,
  onCancel,
}: RequestFormProps) {
  const t = useTranslations("booking.form");
  const fieldErrors = (["day", "time", "duration", "region"] as const).filter(
    (field) => form.errors[field],
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    void form.submit();
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-4"
      data-booking-form
    >
      {fieldErrors.length > 1 ? (
        <InlineAlert tone="error" title={t("summary")}>
          <ul className="flex flex-col gap-1">
            {fieldErrors.map((field) => (
              <li key={field}>
                <a
                  href={`#${FIELD_IDS[field]}`}
                  className="underline underline-offset-4"
                >
                  {form.errors[field]}
                </a>
              </li>
            ))}
          </ul>
        </InlineAlert>
      ) : null}
      {form.errors.form ? (
        <InlineAlert tone="error" title={form.errors.form} />
      ) : null}
      {form.lostTime ? (
        <InlineAlert tone="warning" title={t("lostTime")} />
      ) : null}
      <SlotFields
        days={form.days}
        timeZone={timeZone}
        value={form.slot}
        onChange={form.setSlot}
        errors={form.errors}
        idPrefix="anfrage"
      />
      {regions.length > 0 ? (
        <Select
          id={FIELD_IDS.region}
          label={t("region")}
          optionalLabel={t("optional")}
          hint={t("regionHint")}
          error={form.errors.region}
          value={form.regionId ?? NO_REGION}
          onValueChange={(value) =>
            form.setRegionId(value === NO_REGION ? null : value)
          }
          options={[
            { value: NO_REGION, label: t("noRegion") },
            ...regions.map((region) => ({
              value: region.id,
              label: region.name,
            })),
          ]}
        />
      ) : null}
      <TextArea
        id="anfrage-nachricht"
        label={t("message")}
        optionalLabel={t("optional")}
        hint={t("messageHint", { name })}
        value={form.message}
        maxLength={MESSAGE_MAX}
        countLabel={(used, max) => t("count", { used, max })}
        onChange={(event) => form.setMessage(event.target.value)}
        rows={4}
        autoGrow
      />
      {signedIn ? null : (
        <p className="text-small text-ink-muted">{t("signInNote")}</p>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 xs:flex-row">
        <Button type="submit" variant="primary" loading={form.pending}>
          {t("submit")}
        </Button>
        <Button type="button" variant="quiet" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
