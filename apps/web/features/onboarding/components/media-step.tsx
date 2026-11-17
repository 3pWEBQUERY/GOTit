import type { Locale } from "@app/core/locale";
import { UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { MediaLibrary } from "../../media/library/media-library";
import { loadLibrary } from "../../media/queries/load-library";
import { createHref } from "../../shell/nav/href";
import { getViewer } from "../../shell/queries/get-viewer";
import { CompleteStepButton } from "./complete-step-button";
import { StepActions, type StepBack } from "./step-actions";

/**
 * Schritt «Medien»: dieselbe Bibliothek wie im Studio (Upload, Reihenfolge,
 * Titelbild). Im Entwurf ist das Studio noch zu, deshalb ohne Detailseite; ist
 * es offen, führt ein Link zur vollen Bibliothek. Der Schritt bleibt überspringbar.
 */
export async function MediaStep({ locale, nextHref, back, studioOpen }: { locale: Locale; nextHref: string; back: StepBack | null; studioOpen: boolean }) {
  const [t, tNav, viewer] = await Promise.all([getTranslations({ locale, namespace: "media.onboarding" }), getTranslations({ locale, namespace: "onboarding.nav" }), getViewer()]);
  const data = viewer.kind === "account" ? await loadLibrary(viewer.userId, locale, { withDetail: studioOpen }) : null;
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body">{t("intro")}</p>
      {studioOpen ? (
        <UiLink href={createHref(locale)("/studio/medien")} className="inline-flex min-h-11 items-center self-start text-body text-ink underline underline-offset-4 hover:text-accent">
          {t("openLibrary")}
        </UiLink>
      ) : null}
      {data ? <MediaLibrary data={data} /> : null}
      <StepActions back={back}>
        <CompleteStepButton step="media" nextHref={nextHref} label={tNav("skip")} />
      </StepActions>
    </div>
  );
}
