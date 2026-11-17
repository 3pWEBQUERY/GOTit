import type { Locale } from "@app/core/locale";
import type { OnboardingStepKey } from "@app/core/onboarding/schemas";
import { UiLink } from "@app/ui";
import { CircleAlert, CircleCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import type { OnboardingData } from "../queries/load-onboarding";
import { stepHref } from "../step-href";
import { STEP_KEYS } from "../steps";
import { StepActions, type StepBack } from "./step-actions";
import { SubmitProfileButton, type MissingLink } from "./submit-profile-button";

/** Einreichen: was noch fehlt, mit Link zum Schritt, und «Profil einreichen» (PRD 11.8). */
export async function SubmitStep({ locale, data, back }: { locale: Locale; data: OnboardingData; back: StepBack | null }) {
  const t = await getTranslations({ locale, namespace: "onboarding" });
  const link = (key: OnboardingStepKey): MissingLink => ({
    key,
    label: t("submit.missingStep", { step: t(`steps.${key}.name`) }),
    href: stepHref(locale, key),
  });
  const missing = data.missing.map(link);
  const allSteps = STEP_KEYS.map(link);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body">{t("submit.intro")}</p>
      {missing.length > 0 ? (
        <section aria-labelledby="einreichen-fehlt" className="flex flex-col gap-2">
          <h2 id="einreichen-fehlt" className="text-h2">
            {t("submit.missingTitle")}
          </h2>
          <ul data-missing-steps className="flex flex-col divide-y divide-border">
            {missing.map((entry) => (
              <li key={entry.key} className="flex min-h-11 items-center gap-2">
                <CircleAlert aria-hidden strokeWidth={1.5} className="size-5 shrink-0 text-warning" />
                <UiLink href={entry.href} className="text-body text-ink underline underline-offset-4 hover:text-accent">
                  {entry.label}
                </UiLink>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="flex items-center gap-2 text-body">
          <CircleCheck aria-hidden strokeWidth={1.5} className="size-5 shrink-0" />
          {t("submit.ready")}
        </p>
      )}
      <StepActions back={back}>
        <SubmitProfileButton studioHref={getPathname({ href: "/studio", locale })} links={allSteps} />
      </StepActions>
    </div>
  );
}
