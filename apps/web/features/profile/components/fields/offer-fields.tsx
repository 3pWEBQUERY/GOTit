"use client";

import type { EditorValues } from "@app/core/provider-profile/schemas";
import { Checkbox, CheckboxGroup, EmptyState } from "@app/ui";
import { useTranslations } from "next-intl";
import type { FieldsProps } from "./types";

export interface OfferFieldsProps extends FieldsProps<EditorValues["offer"]> {
  categories: readonly { id: string; name: string }[];
}

/**
 * Leistungen aus den zentral gepflegten Kategorien (PRD v1 FR-PROFILE-002).
 * Solange keine freigegeben sind, sagt der Abschnitt das (Entscheid 0004).
 */
export function OfferFields({ value, onChange, errors, categories, disabled }: OfferFieldsProps) {
  const t = useTranslations("profile.fields");
  if (categories.length === 0) return <EmptyState title={t("offerLater")} description={t("offerLaterHint")} />;
  const toggle = (id: string, checked: boolean) =>
    onChange({ categoryIds: checked ? [...value.categoryIds.filter((entry) => entry !== id), id] : value.categoryIds.filter((entry) => entry !== id) });
  return (
    <CheckboxGroup label={t("services")} hint={t("servicesHint")} error={errors.errorText("categoryIds")}>
      <div className="grid gap-x-6 xs:grid-cols-2">
        {categories.map((category, index) => (
          <Checkbox
            key={category.id}
            id={index === 0 ? "profil-leistung-erste" : undefined}
            label={category.name}
            disabled={disabled}
            checked={value.categoryIds.includes(category.id)}
            onCheckedChange={(checked) => toggle(category.id, checked === true)}
          />
        ))}
      </div>
    </CheckboxGroup>
  );
}
