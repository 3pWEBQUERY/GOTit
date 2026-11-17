"use client";

import type { EditorValues } from "@app/core/provider-profile/schemas";
import { TextArea } from "@app/ui";
import { useTranslations } from "next-intl";
import type { FieldsProps } from "./types";

const DESCRIPTION_MAX = 4000;

/** Beschreibung («Über mich»): mindestens 50 Zeichen, mit Zähler. */
export function DescriptionFields({ value, onChange, errors, onBlurField, disabled }: FieldsProps<EditorValues["description"]>) {
  const t = useTranslations("profile.fields");
  const tForm = useTranslations("profile.form");
  return (
    <TextArea
      id="profil-beschreibung"
      label={t("description")}
      hint={t("descriptionHint")}
      rows={10}
      maxLength={DESCRIPTION_MAX}
      countLabel={(used, max) => tForm("count", { used, max })}
      disabled={disabled}
      value={value.description}
      error={errors.errorText("description")}
      onChange={(event) => onChange({ description: event.target.value })}
      onBlur={() => onBlurField("description")}
    />
  );
}
