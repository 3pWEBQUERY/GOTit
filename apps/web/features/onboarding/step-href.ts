import type { OnboardingStepKey } from "@app/core/onboarding/schemas";
import type { Locale } from "@app/core/locale";
import { getPathname } from "@/i18n/navigation";
import { stepSlug } from "./steps";

/** Übersetzte Adresse eines Schritts, zum Beispiel `/de/studio/start/regionen`. */
export function stepHref(locale: Locale, key: OnboardingStepKey): string {
  return getPathname({
    href: {
      pathname: "/studio/start/[schritt]",
      params: { schritt: stepSlug(locale, key) },
    },
    locale,
  });
}
