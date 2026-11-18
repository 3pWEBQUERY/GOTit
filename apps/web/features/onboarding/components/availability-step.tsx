import { getOwnCalendar } from "@app/core/booking";
import type { Locale } from "@app/core/locale";
import { getTranslations } from "next-intl/server";
import { WindowsForm } from "../../booking/studio/availability/windows-form";
import { windowsToValue } from "../../booking/studio/lib/windows";
import { getViewer } from "../../shell/queries/get-viewer";
import { CompleteStepButton } from "./complete-step-button";
import { StepActions, type StepBack } from "./step-actions";

/**
 * Schritt «Verfügbarkeit» (PRD 11.8, v1 Journey B Schritt 9): dieselben
 * Arbeitszeiten wie unter `/studio/kalender/verfuegbarkeit`, schon im Entwurf.
 * Regeln, Abwesenheiten und Blocker folgen im Kalender des Studios. Der
 * Schritt bleibt überspringbar; mit gespeicherten Zeiten heisst der Button «Weiter».
 */
export async function AvailabilityStep({ locale, nextHref, nextLabel, back }: { locale: Locale; nextHref: string; nextLabel: string; back: StepBack | null }) {
  const [t, viewer] = await Promise.all([getTranslations({ locale, namespace: "onboarding" }), getViewer()]);
  const own = viewer.kind === "account" ? await getOwnCalendar(viewer.userId) : null;
  const hasWindows = (own?.windows.length ?? 0) > 0;
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body">{t("availability.intro")}</p>
      {own ? (
        <div className="max-w-reading">
          <WindowsForm initial={windowsToValue(own.windows)} />
        </div>
      ) : null}
      <p className="border-l-2 border-border-strong pl-3 text-small text-ink-muted">{t("availability.later")}</p>
      <StepActions back={back}>
        <CompleteStepButton step="availability" nextHref={nextHref} label={hasWindows ? nextLabel : t("nav.skip")} />
      </StepActions>
    </div>
  );
}
