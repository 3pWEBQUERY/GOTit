import { z } from "zod";

/**
 * Die acht Schritte aus PRD 11.8 mit geschätzter Dauer. Pflicht sind
 * Identität, Regionen und Profil; Medien und Verfügbarkeit sind freiwillig,
 * weil ein Profil ohne sie ehrlich weniger zeigt (PRD 10.1: ohne Kalender kein
 * Abschnitt, ohne Medien eine neutrale Fläche). Entscheid 0009.
 */
export const ONBOARDING_STEPS = [
  { key: "identity", minutes: 5, required: true },
  { key: "regions", minutes: 1, required: true },
  { key: "profile", minutes: 5, required: true },
  { key: "media", minutes: 5, required: false },
  { key: "offer", minutes: 3, required: false },
  { key: "availability", minutes: 3, required: false },
  { key: "preview", minutes: 2, required: true },
  { key: "submit", minutes: 1, required: true },
] as const;
export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

export const DESCRIPTION_MIN_LENGTH = 50;
export const LANGUAGE_CODES = ["de", "fr", "it", "en", "es", "pt", "ru", "ro", "hu", "pl", "cs", "uk", "tr", "ar", "zh", "th"] as const;

export const regionsSchema = z.object({ regionIds: z.array(z.string().min(1).max(40)).min(1, "regionsRequired").max(10, "regionsTooMany") });

export const profileBasicsSchema = z.object({
  displayName: z.string().trim().min(2, "displayNameTooShort").max(60, "displayNameTooLong"),
  description: z.string().trim().min(DESCRIPTION_MIN_LENGTH, "descriptionTooShort").max(4000, "descriptionTooLong"),
  languages: z.array(z.enum(LANGUAGE_CODES)).min(1, "languagesRequired").max(8),
});

export const rateSchema = z.object({
  durationMinutes: z.number().int().min(15, "durationTooShort").max(24 * 60, "durationTooLong"),
  priceChf: z.number().int().min(1, "priceTooLow").max(100_000, "priceTooHigh"),
  note: z.string().trim().max(120, "noteTooLong").optional(),
});
export const offerSchema = z.object({ rates: z.array(rateSchema).max(12, "ratesTooMany") });

/** Einreichen verlangt die ausdrückliche Zustimmung zur Veröffentlichung (PRD v1 FR-VERIFY-002). */
export const submitSchema = z.object({ publicationConsent: z.literal(true, "publicationConsentRequired") });
