import type { OnboardingStepKey } from "@app/core/onboarding/schemas";
import type { ProviderStatus } from "@app/db";
import { NOTE_STEPS, STEP_KEYS, type NoteStep } from "./steps";

export type OnboardingAccess = "edit" | "in-review" | "suspended" | "none";

/**
 * Wer das Onboarding bearbeiten darf: nur Profile im Entwurf oder in Korrektur.
 * Eingereichte, freigegebene und pausierte Profile sehen den Prüfstatus in
 * `/studio`; gesperrte Profile eine Erklärung.
 */
export function onboardingAccess(status: ProviderStatus | null): OnboardingAccess {
  if (status === "DRAFT" || status === "CHANGES_REQUESTED") return "edit";
  if (status === "SUBMITTED" || status === "PUBLISHED" || status === "PAUSED") return "in-review";
  if (status === "SUSPENDED") return "suspended";
  return "none";
}

/**
 * Wohin `/studio/start` führt (PRD 8.2): bei einer Rückgabe zum ersten Schritt
 * mit Prüfnotiz, sonst zum ersten offenen Schritt, zuletzt zum Einreichen.
 */
export function firstOpenStep(done: readonly string[], notes: Partial<Record<NoteStep, string>>): OnboardingStepKey {
  const noted = NOTE_STEPS.filter((key) => notes[key]);
  const firstNoted = STEP_KEYS.find((key) => (noted as readonly string[]).includes(key));
  if (firstNoted) return firstNoted;
  return STEP_KEYS.find((key) => key !== "submit" && !done.includes(key)) ?? "submit";
}
