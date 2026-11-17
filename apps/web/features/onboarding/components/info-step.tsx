import type { Locale } from "@app/core/locale";
import { EmptyState } from "@app/ui";
import { CalendarClock, ImageIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CompleteStepButton } from "./complete-step-button";
import { StepActions, type StepBack } from "./step-actions";

/**
 * Medien und Verfügbarkeit: Ihre Editoren kommen mit der Medienbibliothek und
 * dem Kalender (Entscheid 0009). Bis dahin sagt der Schritt das ehrlich und
 * lässt sich überspringen.
 */
export async function InfoStep({ locale, step, nextHref, back }: { locale: Locale; step: "media" | "availability"; nextHref: string; back: StepBack | null }) {
  const t = await getTranslations({ locale, namespace: "onboarding" });
  return (
    <div className="flex flex-col gap-6">
      <EmptyState
        icon={step === "media" ? <ImageIcon strokeWidth={1.5} /> : <CalendarClock strokeWidth={1.5} />}
        title={t(`${step}.text`)}
        description={t(`${step}.neutral`)}
        className="py-0"
      />
      <StepActions back={back}>
        <CompleteStepButton step={step} nextHref={nextHref} label={t("nav.skip")} />
      </StepActions>
    </div>
  );
}
