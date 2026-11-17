import type { AccountViewer } from "@app/core/identity";
import { getOnboardingState } from "@app/core/onboarding";
import { getLatestIdentityCheck, resolveIdentityProvider } from "@app/core/verification";
import { cache } from "react";
import { identityView } from "../../verification/identity-view";
import { reviewNotes } from "../review-notes";

/**
 * Alles, was die Schritte brauchen, einmal pro Anfrage: Stand des Onboardings,
 * letzte Identitätsprüfung und die Prüfnotizen einer Rückgabe zur Korrektur.
 */
export const loadOnboarding = cache(async (viewer: AccountViewer) => {
  const now = new Date();
  const [state, check] = await Promise.all([getOnboardingState(viewer.userId, now), getLatestIdentityCheck(viewer.userId)]);
  return {
    ...state,
    check,
    identityStatus: identityView(check, now),
    providerConfigured: resolveIdentityProvider() !== null,
    notes: reviewNotes(state.profile.status, state.latestReview),
  };
});

export type OnboardingData = Awaited<ReturnType<typeof loadOnboarding>>;
