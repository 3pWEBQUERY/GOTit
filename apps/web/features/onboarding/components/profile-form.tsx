"use client";

import { LANGUAGE_CODES, profileBasicsSchema } from "@app/core/onboarding/schemas";
import { Button, Checkbox, CheckboxGroup, TextArea, TextField } from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormErrorSummary } from "../../settings/components/form-error-summary";
import { saveProfileAction } from "../actions/save-step";
import { languageName } from "../format";
import { StepActions, type StepBack } from "./step-actions";
import { issuesToErrors, normalizeErrors, useStepErrors } from "./use-step-errors";

const IDS: Record<string, string> = {
  displayName: "profil-anzeigename",
  description: "profil-beschreibung",
  languages: "profil-sprache-de",
};
const DESCRIPTION_MAX = 4000;

export interface ProfileFormProps {
  initial: { displayName: string; description: string; languages: string[] };
  nextHref: string;
  back: StepBack | null;
}

const fallback = (path: string) => (path === "languages" ? "languagesTooMany" : "generic");

/** Anzeigename, Beschreibung mit Zeichenzähler und Sprachen. Prüft beim Verlassen und beim Speichern. */
export function ProfileForm({ initial, nextHref, back }: ProfileFormProps) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const form = useStepErrors((path) => IDS[path] ?? IDS.displayName ?? "");

  const check = (next: typeof values) => {
    const parsed = profileBasicsSchema.safeParse(next);
    return parsed.success ? {} : issuesToErrors(parsed.error.issues, fallback);
  };

  function toggleLanguage(code: string, checked: boolean) {
    const languages = checked ? [...values.languages.filter((entry) => entry !== code), code] : values.languages.filter((entry) => entry !== code);
    const next = { ...values, languages };
    setValues(next);
    form.applyField("languages", check(next));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.applyAll(check(values))) return;
    setPending(true);
    try {
      const result = await saveProfileAction(values);
      if (result.ok) {
        router.push(nextHref);
        return;
      }
      form.applyAll(normalizeErrors(result.fieldErrors ?? {}, fallback), result.formError ?? null);
    } catch {
      form.applyAll({}, "generic");
    }
    setPending(false);
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
      <FormErrorSummary title={t("form.summaryTitle")} entries={form.summary} formError={form.formError} />
      <TextField
        id={IDS.displayName}
        label={t("profile.displayName")}
        hint={t("profile.displayNameHint")}
        autoComplete="nickname"
        maxLength={60}
        value={values.displayName}
        error={form.errorText("displayName")}
        onChange={(event) => setValues({ ...values, displayName: event.target.value })}
        onBlur={() => form.applyField("displayName", check(values))}
      />
      <TextArea
        id={IDS.description}
        label={t("profile.description")}
        hint={t("profile.descriptionHint")}
        rows={8}
        maxLength={DESCRIPTION_MAX}
        countLabel={(used, max) => t("profile.count", { used, max })}
        value={values.description}
        error={form.errorText("description")}
        onChange={(event) => setValues({ ...values, description: event.target.value })}
        onBlur={() => form.applyField("description", check(values))}
      />
      <CheckboxGroup label={t("profile.languages")} hint={t("profile.languagesHint")} error={form.errorText("languages")}>
        <div className="grid gap-x-6 xs:grid-cols-2 md:grid-cols-3">
          {LANGUAGE_CODES.map((code) => (
            <Checkbox
              key={code}
              id={`profil-sprache-${code}`}
              label={languageName(locale, code)}
              checked={values.languages.includes(code)}
              onCheckedChange={(checked) => toggleLanguage(code, checked === true)}
            />
          ))}
        </div>
      </CheckboxGroup>
      <StepActions back={back}>
        <Button type="submit" variant="primary" loading={pending}>
          {t("nav.saveAndContinue")}
        </Button>
      </StepActions>
    </form>
  );
}
