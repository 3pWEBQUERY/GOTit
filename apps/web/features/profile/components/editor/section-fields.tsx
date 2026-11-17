"use client";

import type { ProfileSection } from "@app/core/provider-profile/schemas";
import type { CantonGroup, RegionOption } from "../../../onboarding/queries/list-approved-regions";
import type { FormValues } from "../../editor-values";
import { BasicsFields } from "../fields/basics-fields";
import { ContactFields } from "../fields/contact-fields";
import { DescriptionFields } from "../fields/description-fields";
import { OfferFields } from "../fields/offer-fields";
import { RatesFields } from "../fields/rates-fields";
import { RegionsFields } from "../fields/regions-fields";
import { VisibilityFields } from "../fields/visibility-fields";
import type { SectionErrors } from "./use-section-errors";

export interface EditorChoices {
  regionGroups: { cantons: readonly CantonGroup[]; looseCities: readonly RegionOption[] };
  categories: readonly { id: string; name: string }[];
}

export interface SectionFieldsProps {
  section: ProfileSection;
  form: FormValues;
  onChange: (form: FormValues) => void;
  errors: SectionErrors;
  onBlurField: (path: string) => void;
  choices: EditorChoices;
  disabled?: boolean;
}

/** Die Felder des gewählten Abschnitts. */
export function SectionFields({ section, form, onChange, errors, onBlurField, choices, disabled }: SectionFieldsProps) {
  const common = { errors, onBlurField, disabled };
  switch (section) {
    case "basics":
      return <BasicsFields {...common} value={form.basics} onChange={(basics) => onChange({ ...form, basics })} />;
    case "description":
      return <DescriptionFields {...common} value={form.description} onChange={(description) => onChange({ ...form, description })} />;
    case "offer":
      return <OfferFields {...common} value={form.offer} categories={choices.categories} onChange={(offer) => onChange({ ...form, offer })} />;
    case "rates":
      return <RatesFields {...common} value={form.rates} onChange={(rates) => onChange({ ...form, rates })} />;
    case "contact":
      return <ContactFields {...common} value={form.contact} onChange={(contact) => onChange({ ...form, contact })} />;
    case "visibility":
      return <VisibilityFields {...common} value={form.visibility} onChange={(visibility) => onChange({ ...form, visibility })} />;
    case "regions":
      return <RegionsFields {...common} value={form.regions} groups={choices.regionGroups} onChange={(regions) => onChange({ ...form, regions })} />;
  }
}
