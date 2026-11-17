import { ONBOARDING_STEPS, type OnboardingStepKey } from "@app/core/onboarding/schemas";
import type { Locale } from "@app/core/locale";
import { InlineAlert, ProgressSteps, UiLink, type ProgressStep } from "@app/ui";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { TopBarTitle } from "../../shell/components/top-bar-title";
import type { OnboardingData } from "../queries/load-onboarding";
import { stepIndex, NOTE_STEPS } from "../steps";
import { stepHref } from "../step-href";

/**
 * Rahmen jedes Schritts (PRD 11.8): sichtbarer Fortschritt mit Dauer, bei einer
 * Rückgabe zur Korrektur oben der Grund pro Schritt mit Link dorthin, darunter
 * der Schritt selbst. Auf Mobile ist die Tab-Leiste ausgeblendet, weil der
 * Ablauf ein mehrstufiges Formular ist (PRD 6.4).
 */
export async function StepFrame({ locale, step, data, children }: { locale: Locale; step: OnboardingStepKey; data: OnboardingData; children: ReactNode }) {
  const t = await getTranslations({ locale, namespace: "onboarding" });
  const duration = (key: OnboardingStepKey) =>
    t("progress.duration", {
      minutes: ONBOARDING_STEPS[stepIndex(key)]?.minutes ?? 1,
    });
  const steps: ProgressStep[] = ONBOARDING_STEPS.map(({ key }) => ({
    id: key,
    label: t("progress.stepLabel", {
      name: t(`steps.${key}.name`),
      duration: duration(key),
    }),
    state: key === step ? "current" : data.done.includes(key) ? "done" : "upcoming",
    href: key === step ? undefined : stepHref(locale, key),
  }));
  const position = {
    current: stepIndex(step) + 1,
    total: ONBOARDING_STEPS.length,
    duration: duration(step),
  };
  const otherNotes = NOTE_STEPS.filter((key) => key !== step && data.notes[key]);
  const ownNote = (NOTE_STEPS as readonly OnboardingStepKey[]).includes(step) ? data.notes[step as (typeof NOTE_STEPS)[number]] : undefined;

  return (
    <div data-onboarding-step={step} className="flex flex-col gap-6 [body:has(&)_[data-glass-tab-bar]]:hidden">
      <TopBarTitle title={t(`steps.${step}.title`)} />
      <ProgressSteps
        label={t("progress.label")}
        steps={steps}
        summary={t("progress.summary", {
          ...position,
          name: t(`steps.${step}.name`),
        })}
        labels={{
          done: t("progress.done"),
          current: t("progress.current"),
          upcoming: t("progress.upcoming"),
        }}
        className="hyphens-auto [&_ol]:wrap-break-word md:max-lg:[&_ol]:hidden md:max-lg:[&>div]:flex"
      />
      <div className="flex max-w-reading flex-col gap-6">
        {otherNotes.length > 0 ? (
          <InlineAlert tone="warning" title={t("review.title")}>
            <p>{t("review.intro")}</p>
            <ul data-review-notes className="mt-2 flex flex-col gap-2">
              {otherNotes.map((key) => (
                <li key={key} className="flex flex-col gap-1">
                  <span className="text-ink">{data.notes[key]}</span>
                  <UiLink href={stepHref(locale, key)} className="self-start underline underline-offset-4 hover:text-ink">
                    {t("review.goTo", { step: t(`steps.${key}.name`) })}
                  </UiLink>
                </li>
              ))}
            </ul>
          </InlineAlert>
        ) : null}
        <header className="flex flex-col gap-1">
          <h1 className="text-h1">{t(`steps.${step}.title`)}</h1>
          <p className="tabular hidden text-small text-ink-muted lg:block">{t("progress.position", position)}</p>
        </header>
        {ownNote ? (
          <InlineAlert tone="warning" title={t("review.noteTitle")}>
            <p data-step-note>{ownNote}</p>
          </InlineAlert>
        ) : null}
        {children}
      </div>
    </div>
  );
}
