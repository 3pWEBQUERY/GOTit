"use client";

import type { EditorValues } from "@app/core/provider-profile/schemas";
import { Checkbox, CheckboxGroup, FieldMessage } from "@app/ui";
import { useTranslations } from "next-intl";
import type { CantonGroup, RegionOption } from "../../../onboarding/queries/list-approved-regions";
import type { FieldsProps } from "./types";

export interface RegionsFieldsProps extends FieldsProps<EditorValues["regions"]> {
  groups: { cantons: readonly CantonGroup[]; looseCities: readonly RegionOption[] };
}

/** Regionen als Kästchen, nach Kanton gruppiert; mindestens eine, höchstens zehn. Nie eine genaue Adresse. */
export function RegionsFields({ value, onChange, errors, groups, disabled }: RegionsFieldsProps) {
  const t = useTranslations("profile.fields");
  const firstId = groups.cantons[0]?.id ?? groups.looseCities[0]?.id;
  const toggle = (id: string, checked: boolean) =>
    onChange({ regionIds: checked ? [...value.regionIds.filter((entry) => entry !== id), id] : value.regionIds.filter((entry) => entry !== id) });
  const box = (option: RegionOption, label: string) => (
    <Checkbox
      key={option.id}
      id={option.id === firstId ? "profil-region-erste" : undefined}
      label={label}
      disabled={disabled}
      checked={value.regionIds.includes(option.id)}
      onCheckedChange={(checked) => toggle(option.id, checked === true)}
    />
  );
  const error = errors.errorText("regionIds");
  return (
    <div className="flex flex-col gap-4">
      <p className="border-l-2 border-border-strong pl-3 text-small text-ink-muted">{t("regionsPrivacy")}</p>
      <p className="text-small text-ink-muted" aria-live="polite">
        {t("regionsCount", { count: value.regionIds.length })}
      </p>
      <div className="grid gap-6 xs:grid-cols-2">
        {groups.cantons.map((canton) => (
          <CheckboxGroup key={canton.id} label={canton.name}>
            {box(canton, t("wholeCanton", { name: canton.name }))}
            {canton.cities.map((city) => box(city, city.name))}
          </CheckboxGroup>
        ))}
        {groups.looseCities.length > 0 ? <CheckboxGroup label={t("otherCities")}>{groups.looseCities.map((city) => box(city, city.name))}</CheckboxGroup> : null}
      </div>
      {error ? (
        <FieldMessage id="profil-regionen-fehler" kind="error">
          {error}
        </FieldMessage>
      ) : null}
    </div>
  );
}
