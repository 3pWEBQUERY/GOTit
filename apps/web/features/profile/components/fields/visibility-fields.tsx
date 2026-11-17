"use client";

import { LOCATION_LABEL_MAX, type EditorValues } from "@app/core/provider-profile/schemas";
import { RadioGroup, TextField } from "@app/ui";
import { useTranslations } from "next-intl";
import type { FieldsProps } from "./types";

/** Sichtbarkeit (öffentlich oder nur Mitglieder) und eine allgemeine Ortsangabe, nie eine Adresse (PRD v2 16.1). */
export function VisibilityFields({ value, onChange, errors, onBlurField, disabled }: FieldsProps<EditorValues["visibility"]>) {
  const t = useTranslations("profile.fields");
  const tForm = useTranslations("profile.form");
  return (
    <>
      <div id="profil-sichtbarkeit">
        <RadioGroup
          label={t("visibility")}
          name="sichtbarkeit"
          disabled={disabled}
          value={value.visibility}
          onValueChange={(next) => onChange({ ...value, visibility: next === "MEMBERS" ? "MEMBERS" : "PUBLIC" })}
          options={[
            { value: "PUBLIC", label: t("visibilityPublic"), description: t("visibilityPublicHint") },
            { value: "MEMBERS", label: t("visibilityMembers"), description: t("visibilityMembersHint") },
          ]}
        />
      </div>
      <TextField
        id="profil-ort"
        label={t("locationLabel")}
        hint={t("locationLabelHint")}
        optionalLabel={tForm("optional")}
        maxLength={LOCATION_LABEL_MAX}
        disabled={disabled}
        value={value.locationLabel}
        error={errors.errorText("locationLabel")}
        onChange={(event) => onChange({ ...value, locationLabel: event.target.value })}
        onBlur={() => onBlurField("locationLabel")}
      />
    </>
  );
}
