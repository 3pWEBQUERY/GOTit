import { ONBOARDING_STEPS, type OnboardingStepKey } from "@app/core/onboarding/schemas";
import type { Locale } from "@app/core/locale";

/** Adressen der acht Schritte pro Sprache (PRD 7.6: `/studio/start/[schritt]`). */
const STEP_SLUGS: Record<Locale, Record<OnboardingStepKey, string>> = {
  de: {
    identity: "identitaet",
    regions: "regionen",
    profile: "profil",
    media: "medien",
    offer: "angebot",
    availability: "verfuegbarkeit",
    preview: "vorschau",
    submit: "einreichen",
  },
  fr: {
    identity: "identite",
    regions: "regions",
    profile: "profil",
    media: "medias",
    offer: "offre",
    availability: "disponibilite",
    preview: "apercu",
    submit: "envoi",
  },
  it: {
    identity: "identita",
    regions: "regioni",
    profile: "profilo",
    media: "media",
    offer: "offerta",
    availability: "disponibilita",
    preview: "anteprima",
    submit: "invio",
  },
  en: {
    identity: "identity",
    regions: "regions",
    profile: "profile",
    media: "media",
    offer: "offer",
    availability: "availability",
    preview: "preview",
    submit: "submit",
  },
};

export const STEP_KEYS: readonly OnboardingStepKey[] = ONBOARDING_STEPS.map((step) => step.key);

export function stepSlug(locale: Locale, key: OnboardingStepKey): string {
  return STEP_SLUGS[locale][key];
}

/**
 * Schritt zu einer Adresse. Nimmt auch die Adresse einer anderen Sprache an,
 * damit ein Sprachwechsel nicht ins Leere führt; die Seite leitet dann um.
 */
export function stepFromSlug(slug: string): OnboardingStepKey | null {
  for (const slugs of Object.values(STEP_SLUGS)) {
    const key = STEP_KEYS.find((candidate) => slugs[candidate] === slug);
    if (key) return key;
  }
  return null;
}

export function stepIndex(key: OnboardingStepKey): number {
  return STEP_KEYS.indexOf(key);
}

export function neighbours(key: OnboardingStepKey): {
  previous: OnboardingStepKey | null;
  next: OnboardingStepKey | null;
} {
  const index = stepIndex(key);
  return {
    previous: STEP_KEYS[index - 1] ?? null,
    next: STEP_KEYS[index + 1] ?? null,
  };
}

/** Schlüssel der Prüfnotizen (Rückgabe zur Korrektur) gehören zu genau einem Schritt. */
export const NOTE_STEPS = ["regions", "profile", "media", "offer", "availability"] as const satisfies readonly OnboardingStepKey[];
export type NoteStep = (typeof NOTE_STEPS)[number];
