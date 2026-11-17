"use client";

import { OnboardingError } from "@/features/onboarding/components/onboarding-error";

export default function OnboardingErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <OnboardingError reset={reset} />;
}
