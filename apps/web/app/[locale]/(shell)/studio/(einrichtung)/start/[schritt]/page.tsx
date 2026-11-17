import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { StepContent } from "@/features/onboarding/components/step-content";
import { StepFrame } from "@/features/onboarding/components/step-frame";
import { SuspendedNotice } from "@/features/onboarding/components/suspended-notice";
import { requireOnboarding } from "@/features/onboarding/queries/require-onboarding";
import { stepHref } from "@/features/onboarding/step-href";
import { stepFromSlug, stepSlug } from "@/features/onboarding/steps";

interface Props {
  params: Promise<{ locale: string; schritt: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, schritt } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "onboarding",
  });
  const step = stepFromSlug(schritt);
  return {
    title: step ? `${t(`steps.${step}.title`)} · ${t("metaTitle")}` : t("metaTitle"),
  };
}

/** Ein Schritt des Onboardings (PRD 11.8): speichert beim «Weiter», lässt sich später fortsetzen. */
export default async function OnboardingStepPage({ params }: Props) {
  const { locale: rawLocale, schritt } = await params;
  const locale = rawLocale as Locale;
  const step = stepFromSlug(schritt);
  if (!step) notFound();
  if (stepSlug(locale, step) !== schritt) redirect(stepHref(locale, step));
  const gate = await requireOnboarding(locale);
  if (gate.kind === "suspended") return <SuspendedNotice locale={locale} data={gate.data} />;
  return (
    <StepFrame locale={locale} step={step} data={gate.data}>
      <StepContent locale={locale} step={step} data={gate.data} />
    </StepFrame>
  );
}
