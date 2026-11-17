"use client";

import { locationSchema } from "@app/core/organization/schemas";
import {
  Button,
  InlineAlert,
  Select,
  TextArea,
  TextField,
  useToast,
} from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { saveLocationAction } from "../actions/locations";
import { focusFirstError, useSchemaForm } from "../lib/use-schema-form";
import { ErrorSummary } from "./error-summary";

export interface LocationValues {
  name: string;
  description: string;
  regionId: string | null;
  areaLabel: string;
  phone: string;
  website: string;
}

export const EMPTY_LOCATION: LocationValues = {
  name: "",
  description: "",
  regionId: null,
  areaLabel: "",
  phone: "",
  website: "",
};
const NO_REGION = "keine";
const FIELDS = [
  "name",
  "description",
  "regionId",
  "areaLabel",
  "phone",
  "website",
] as const;

/**
 * Angaben eines Standorts (v1 FR-BUSINESS-002): Name, Beschreibung, Region aus
 * den freigegebenen, allgemeine Ortsangabe und Kontakt. Nie eine Adresse
 * (v2 16.1). Im Dialog «Standort hinzufügen» und auf der Detailseite.
 */
export function LocationForm({
  slug,
  locationId,
  initial,
  regions,
  canEdit,
  onSaved,
  footer,
}: {
  slug: string;
  locationId: string | null;
  initial: LocationValues;
  regions: readonly { value: string; label: string }[];
  canEdit: boolean;
  onSaved?: (id: string) => void;
  /** Eigene Buttons, zum Beispiel «Abbrechen» im Dialog; sonst nur «Speichern». */
  footer?: (pending: boolean) => ReactNode;
}) {
  const t = useTranslations("organization.locations");
  const tForm = useTranslations("organization.form");
  const router = useRouter();
  const { toast } = useToast();
  const form = useRef<HTMLFormElement>(null);
  const { values, set, errors, setErrors, blur, validate } = useSchemaForm(
    locationSchema,
    initial,
  );
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const prefix = locationId ? `standort-${locationId}` : "standort-neu";
  const id = (field: string) => `${prefix}-${field}`;
  const message = (field: string) => {
    const code = errors[field];
    if (!code) return undefined;
    return tForm.has(`errors.${code}`)
      ? tForm(`errors.${code}`)
      : tForm("errors.invalid");
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    setAttempted(true);
    setFailed(null);
    if (Object.keys(validate()).length > 0)
      return focusFirstError(form.current);
    setPending(true);
    const result = await saveLocationAction(slug, locationId, values).catch(
      () => ({
        ok: false as const,
        formError: "generic",
        fieldErrors: undefined,
      }),
    );
    setPending(false);
    if (result.ok && result.data) {
      toast({ title: locationId ? t("saved") : t("created"), tone: "success" });
      router.refresh();
      onSaved?.(result.data.id);
      return;
    }
    if (!result.ok && result.fieldErrors) {
      setErrors(result.fieldErrors);
      return focusFirstError(form.current);
    }
    setFailed((!result.ok && result.formError) || "generic");
  }

  const summary = attempted
    ? FIELDS.flatMap((field) =>
        message(field)
          ? [
              {
                fieldId: id(field),
                message: `${t(`fields.${field}`)}: ${message(field)}`,
              },
            ]
          : [],
      )
    : [];
  const text = (field: "name" | "areaLabel" | "phone" | "website") => ({
    id: id(field),
    label: t(`fields.${field}`),
    hint: t(`fields.${field}Hint`),
    value: values[field],
    disabled: !canEdit || pending,
    error: message(field),
    onChange: (event: { target: { value: string } }) =>
      set(field, event.target.value),
    onBlur: () => blur(field),
  });

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex max-w-reading flex-col gap-5"
      data-location-form={locationId ?? "neu"}
    >
      <ErrorSummary items={summary} />
      {failed ? (
        <InlineAlert tone="error" title={tForm(`errors.${failed}`)}>
          {tForm("nothingLost")}
        </InlineAlert>
      ) : null}
      <TextField {...text("name")} maxLength={80} />
      <TextArea
        id={id("description")}
        label={t("fields.description")}
        hint={t("fields.descriptionHint")}
        optionalLabel={tForm("optional")}
        rows={4}
        maxLength={1000}
        countLabel={(used, max) => tForm("count", { used, max })}
        value={values.description}
        disabled={!canEdit || pending}
        error={message("description")}
        onChange={(event) => set("description", event.target.value)}
        onBlur={() => blur("description")}
      />
      <Select
        id={id("regionId")}
        label={t("fields.regionId")}
        hint={
          regions.length === 0
            ? t("fields.regionNone")
            : t("fields.regionIdHint")
        }
        optionalLabel={tForm("optional")}
        options={[
          { value: NO_REGION, label: t("fields.noRegion") },
          ...regions,
        ]}
        value={values.regionId ?? NO_REGION}
        disabled={!canEdit || pending}
        error={message("regionId")}
        onValueChange={(value) =>
          set("regionId", value === NO_REGION ? null : value)
        }
      />
      <TextField
        {...text("areaLabel")}
        optionalLabel={tForm("optional")}
        maxLength={60}
      />
      <TextField
        {...text("phone")}
        optionalLabel={tForm("optional")}
        type="tel"
        autoComplete="tel"
      />
      <TextField
        {...text("website")}
        optionalLabel={tForm("optional")}
        type="url"
        inputMode="url"
        autoComplete="url"
      />
      {canEdit
        ? (footer?.(pending) ?? (
            <Button
              type="submit"
              variant="primary"
              loading={pending}
              className="self-start"
            >
              {t("save")}
            </Button>
          ))
        : null}
    </form>
  );
}
