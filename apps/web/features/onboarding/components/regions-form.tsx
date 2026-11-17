"use client";

import { regionsSchema } from "@app/core/onboarding/schemas";
import { Button, Checkbox, CheckboxGroup, FieldMessage } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormErrorSummary } from "../../settings/components/form-error-summary";
import { saveRegionsAction } from "../actions/save-step";
import type { CantonGroup, RegionOption } from "../queries/list-approved-regions";
import { StepActions, type StepBack } from "./step-actions";
import { issuesToErrors, normalizeErrors, useStepErrors } from "./use-step-errors";

const FIRST_ID = "region-erste";

export interface RegionsFormProps {
  cantons: readonly CantonGroup[];
  looseCities: readonly RegionOption[];
  initial: readonly string[];
  nextHref: string;
  back: StepBack | null;
}

/** Regionen als Kästchen, nach Kanton gruppiert. Mindestens eine, höchstens zehn. */
export function RegionsForm({ cantons, looseCities, initial, nextHref, back }: RegionsFormProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([...initial]);
  const [pending, setPending] = useState(false);
  const form = useStepErrors(() => FIRST_ID);
  const firstOptionId = cantons[0]?.id ?? looseCities[0]?.id;

  function toggle(id: string, checked: boolean) {
    setSelected((current) => (checked ? [...current.filter((entry) => entry !== id), id] : current.filter((entry) => entry !== id)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { regionIds: selected };
    const parsed = regionsSchema.safeParse(input);
    if (!parsed.success) {
      form.applyAll(issuesToErrors(parsed.error.issues));
      return;
    }
    setPending(true);
    try {
      const result = await saveRegionsAction(input);
      if (result.ok) {
        router.push(nextHref);
        return;
      }
      form.applyAll(normalizeErrors(result.fieldErrors ?? {}), result.formError ?? null);
    } catch {
      form.applyAll({}, "generic");
    }
    setPending(false);
  }

  const box = (option: RegionOption, label: string) => (
    <Checkbox
      key={option.id}
      id={option.id === firstOptionId ? FIRST_ID : undefined}
      label={label}
      checked={selected.includes(option.id)}
      onCheckedChange={(checked) => toggle(option.id, checked === true)}
    />
  );
  const error = form.errorText("regionIds");

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
      <FormErrorSummary title={t("form.summaryTitle")} entries={form.summary} formError={form.formError} />
      <p className="text-small text-ink-muted" aria-live="polite">
        {t("regions.count", { count: selected.length })}
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {cantons.map((canton) => (
          <CheckboxGroup key={canton.id} label={canton.name}>
            {box(canton, t("regions.wholeCanton", { name: canton.name }))}
            {canton.cities.map((city) => box(city, city.name))}
          </CheckboxGroup>
        ))}
        {looseCities.length > 0 ? <CheckboxGroup label={t("regions.otherCities")}>{looseCities.map((city) => box(city, city.name))}</CheckboxGroup> : null}
      </div>
      {error ? (
        <FieldMessage id="regionen-fehler" kind="error">
          {error}
        </FieldMessage>
      ) : null}
      <StepActions back={back}>
        <Button type="submit" variant="primary" loading={pending}>
          {t("nav.saveAndContinue")}
        </Button>
      </StepActions>
    </form>
  );
}
