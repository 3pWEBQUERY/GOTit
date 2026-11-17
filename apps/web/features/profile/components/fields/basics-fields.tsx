"use client";

import { LANGUAGE_CODES } from "@app/core/onboarding/schemas";
import { SHORT_DESCRIPTION_MAX, type EditorValues } from "@app/core/provider-profile/schemas";
import { Checkbox, CheckboxGroup, TextArea, TextField } from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { languageName } from "../../../onboarding/format";
import type { FieldsProps } from "./types";

/** Basis: Anzeigename (prüfpflichtig), Kurzbeschreibung, Sprachen. */
export function BasicsFields({ value, onChange, errors, onBlurField, disabled }: FieldsProps<EditorValues["basics"]>) {
  const t = useTranslations("profile.fields");
  const tForm = useTranslations("profile.form");
  const locale = useLocale();

  function toggle(code: (typeof LANGUAGE_CODES)[number], checked: boolean) {
    const languages = checked ? [...value.languages.filter((entry) => entry !== code), code] : value.languages.filter((entry) => entry !== code);
    onChange({ ...value, languages });
  }

  return (
    <>
      <TextField
        id="profil-anzeigename"
        label={t("displayName")}
        hint={t("displayNameHint")}
        autoComplete="nickname"
        maxLength={60}
        disabled={disabled}
        value={value.displayName}
        error={errors.errorText("displayName")}
        onChange={(event) => onChange({ ...value, displayName: event.target.value })}
        onBlur={() => onBlurField("displayName")}
      />
      <TextArea
        id="profil-kurzbeschreibung"
        label={t("shortDescription")}
        hint={t("shortDescriptionHint")}
        optionalLabel={tForm("optional")}
        rows={3}
        maxLength={SHORT_DESCRIPTION_MAX}
        countLabel={(used, max) => tForm("count", { used, max })}
        disabled={disabled}
        value={value.shortDescription}
        error={errors.errorText("shortDescription")}
        onChange={(event) => onChange({ ...value, shortDescription: event.target.value })}
        onBlur={() => onBlurField("shortDescription")}
      />
      <CheckboxGroup label={t("languages")} hint={t("languagesHint")} error={errors.errorText("languages")}>
        <div className="grid gap-x-6 xs:grid-cols-2">
          {LANGUAGE_CODES.map((code, index) => (
            <Checkbox
              key={code}
              id={index === 0 ? "profil-sprache-erste" : `profil-sprache-${code}`}
              label={languageName(locale, code)}
              disabled={disabled}
              checked={value.languages.includes(code)}
              onCheckedChange={(checked) => toggle(code, checked === true)}
              onBlur={() => onBlurField("languages")}
            />
          ))}
        </div>
      </CheckboxGroup>
    </>
  );
}
