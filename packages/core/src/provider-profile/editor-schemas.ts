import { z } from "zod";
import { profileBasicsSchema, rateSchema, regionsSchema } from "../onboarding/schemas";

/**
 * Abschnitte des Profil-Editors (PRD v2 11.2, 7.6). Gespeichert wird pro
 * Abschnitt; jedes Schema gilt im Browser und in der Server Action.
 */
export const PROFILE_SECTIONS = ["basics", "description", "offer", "rates", "contact", "visibility", "regions"] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

export const SHORT_DESCRIPTION_MAX = 160;
export const LOCATION_LABEL_MAX = 60;
export const RATES_MAX = 12;

export const basicsSectionSchema = z.object({
  displayName: profileBasicsSchema.shape.displayName,
  shortDescription: z.string().trim().max(SHORT_DESCRIPTION_MAX, "shortDescriptionTooLong"),
  languages: profileBasicsSchema.shape.languages,
});

export const descriptionSectionSchema = z.object({ description: profileBasicsSchema.shape.description });

/** Leistungen aus den zentral gepflegten Kategorien; solange keine freigegeben sind, bleibt die Liste leer (Entscheid 0004). */
export const offerSectionSchema = z.object({ categoryIds: z.array(z.string().min(1).max(40)).max(30, "servicesTooMany") });

export const editorRateSchema = rateSchema.extend({
  id: z.string().min(1).max(40).optional(),
  // Einzelne Preise ein- und ausblenden (PRD v1 FR-PROFILE-003).
  hidden: z.boolean(),
});
export const ratesSectionSchema = z.object({ rates: z.array(editorRateSchema).max(RATES_MAX, "ratesTooMany") });

export const contactSectionSchema = z.object({ allowMessages: z.boolean(), allowBookingRequests: z.boolean() });

export const visibilitySectionSchema = z.object({
  visibility: z.enum(["PUBLIC", "MEMBERS"]),
  // Allgemeine Ortsangabe wie «Kreis 4», nie eine Adresse (PRD v2 16.1).
  locationLabel: z.string().trim().max(LOCATION_LABEL_MAX, "locationLabelTooLong"),
});

export const regionsSectionSchema = regionsSchema;

export const SECTION_SCHEMAS = {
  basics: basicsSectionSchema,
  description: descriptionSectionSchema,
  offer: offerSectionSchema,
  rates: ratesSectionSchema,
  contact: contactSectionSchema,
  visibility: visibilitySectionSchema,
  regions: regionsSectionSchema,
} as const satisfies Record<ProfileSection, z.ZodType>;

export type SectionInput<S extends ProfileSection> = z.input<(typeof SECTION_SCHEMAS)[S]>;
export type SectionValues<S extends ProfileSection> = z.output<(typeof SECTION_SCHEMAS)[S]>;
export type EditorValues = { [S in ProfileSection]: SectionValues<S> };

export function isProfileSection(value: unknown): value is ProfileSection {
  return typeof value === "string" && (PROFILE_SECTIONS as readonly string[]).includes(value);
}
