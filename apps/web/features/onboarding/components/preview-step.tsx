import type { Locale } from "@app/core/locale";
import { InlineAlert } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { ProfileView } from "../../profile/components/view/profile-view";
import type { ProfileViewModel } from "../../profile/model";
import type { OnboardingData } from "../queries/load-onboarding";
import type { CantonGroup, RegionOption } from "../queries/list-approved-regions";
import { CompleteStepButton } from "./complete-step-button";
import { StepActions, type StepBack } from "./step-actions";

export interface PreviewStepProps {
  locale: Locale;
  data: OnboardingData;
  regions: {
    cantons: readonly CantonGroup[];
    looseCities: readonly RegionOption[];
  };
  selfHref: string;
  nextHref: string;
  back: StepBack | null;
}

/** Das Profil im Stand des Onboardings als Modell der Profilansicht. Medien erscheinen erst nach ihrer Freigabe. */
function previewModel(data: OnboardingData, regions: PreviewStepProps["regions"]): ProfileViewModel {
  const { profile } = data;
  const names = new Map([...regions.cantons.flatMap((canton) => [canton, ...canton.cities]), ...regions.looseCities].map((region) => [region.id, region.name]));
  const identity = data.identityStatus.kind === "valid" ? data.identityStatus : null;
  return {
    slug: profile.slug,
    displayName: profile.displayName,
    shortDescription: null,
    description: profile.description,
    languages: profile.languages,
    regions: profile.regions.flatMap((entry) => {
      const name = names.get(entry.regionId);
      return name ? [{ id: entry.regionId, name, href: null }] : [];
    }),
    locationLabel: null,
    rates: profile.rates.map((rate, index) => ({ key: `r${index}`, durationMinutes: rate.durationMinutes, priceChf: rate.priceChf, note: rate.note })),
    ratesUpdatedAt: null,
    services: [],
    identityCheckedAt: identity?.checkedAt?.toISOString() ?? null,
    photosChecked: false,
    contentUpdatedAt: null,
    media: [],
    contact: { kind: "open", messages: true, bookingRequests: true },
  };
}

/**
 * Vorschau mit demselben Profil-Renderer wie `/p/[name]` und das Studio
 * (PRD v2 11.2): kein zweiter Renderer. «Identität geprüft» erscheint nur bei
 * gültiger Prüfung.
 */
export async function PreviewStep({ locale, data, regions, nextHref, back }: PreviewStepProps) {
  const [t, tProfile] = await Promise.all([getTranslations({ locale, namespace: "onboarding" }), getTranslations({ locale, namespace: "profile.onboardingPreview" })]);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body">{t("preview.intro")}</p>
      <InlineAlert tone="info" title={tProfile("note")} />
      <section aria-labelledby="vorschau-titel" data-preview className="flex flex-col gap-6 border-t border-border pt-6">
        <h2 id="vorschau-titel" className="text-h2">
          {t("preview.heading")}
        </h2>
        <ProfileView model={previewModel(data, regions)} now={new Date().toISOString()} layout="mobile" nameLevel={3} idPrefix="vorschau" />
      </section>
      <StepActions back={back}>
        <CompleteStepButton step="preview" nextHref={nextHref} label={t("preview.confirm")} />
      </StepActions>
    </div>
  );
}
