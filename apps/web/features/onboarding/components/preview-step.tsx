import type { Locale } from "@app/core/locale";
import { InlineAlert, ProfileCard, RateTable, TrustSignals } from "@app/ui";
import { getFormatter, getTranslations } from "next-intl/server";
import { formatChf, formatDuration, languageName } from "../format";
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

/**
 * Vorschau mit denselben Bausteinen wie die spätere Profilseite (PRD 9.3, 10.1).
 * «Identität geprüft» erscheint nur bei gültiger Prüfung.
 */
export async function PreviewStep({ locale, data, regions, selfHref, nextHref, back }: PreviewStepProps) {
  const [t, format] = await Promise.all([getTranslations({ locale, namespace: "onboarding" }), getFormatter({ locale })]);
  const { profile } = data;
  const names = new Map([...regions.cantons.flatMap((canton) => [canton, ...canton.cities]), ...regions.looseCities].map((region) => [region.id, region.name]));
  const regionText = profile.regions
    .map((entry) => names.get(entry.regionId))
    .filter(Boolean)
    .join(", ");
  const identity = data.identityStatus.kind === "valid" ? data.identityStatus : null;
  const signal = { key: "identity", label: t("preview.identitySignal") };
  const languages = new Intl.ListFormat(locale, { type: "conjunction" }).format(profile.languages.map((code) => languageName(locale, code)));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body">{t("preview.intro")}</p>
      <InlineAlert tone="info" title={t("preview.note")} />
      <section aria-labelledby="vorschau-titel" data-preview className="flex flex-col gap-6 border-t border-border pt-6">
        <h2 id="vorschau-titel" className="text-h2">
          {t("preview.heading")}
        </h2>
        <ProfileCard
          href={selfHref}
          name={profile.displayName}
          region={regionText || t("preview.noRegion")}
          signals={identity ? [signal] : []}
          headingLevel={3}
          className="max-w-72"
        />
        <section aria-labelledby="vorschau-beschreibung" className="flex flex-col gap-2">
          <h3 id="vorschau-beschreibung" className="text-h3">
            {t("preview.description")}
          </h3>
          <p className="text-body whitespace-pre-line">{profile.description || t("preview.noDescription")}</p>
          {languages ? <p className="text-small text-ink-muted">{`${t("preview.languages")}: ${languages}`}</p> : null}
        </section>
        <section aria-labelledby="vorschau-preise" className="flex flex-col gap-2">
          <h3 id="vorschau-preise" className="text-h3">
            {t("preview.rates")}
          </h3>
          <RateTable
            caption={t("preview.rates")}
            hideCaption
            columns={{
              duration: t("preview.columns.duration"),
              price: t("preview.columns.price"),
              note: t("preview.columns.note"),
            }}
            rows={profile.rates.map((rate, index) => ({
              key: String(index),
              duration: formatDuration(locale, rate.durationMinutes),
              price: formatChf(locale, rate.priceChf),
              note: rate.note ?? undefined,
            }))}
            emptyText={t("preview.ratesEmpty")}
          />
        </section>
        <section aria-labelledby="vorschau-vertrauen" className="flex flex-col gap-2">
          <h3 id="vorschau-vertrauen" className="text-h3">
            {t("preview.trust")}
          </h3>
          {identity ? (
            <TrustSignals
              label={t("preview.trust")}
              signals={[
                {
                  ...signal,
                  infoLabel: t("preview.identityInfo"),
                  explanation: {
                    checked: t("preview.identityChecked"),
                    checkedAt: identity.checkedAt
                      ? format.dateTime(identity.checkedAt, {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "",
                    notImplied: t("preview.identityNotImplied"),
                  },
                },
              ]}
              explanationLabels={{
                checked: t("preview.explanation.checked"),
                checkedAt: t("preview.explanation.checkedAt"),
                notImplied: t("preview.explanation.notImplied"),
              }}
              closeLabel={t("preview.close")}
            />
          ) : (
            <p className="text-body text-ink-muted">{t("preview.trustEmpty")}</p>
          )}
        </section>
      </section>
      <StepActions back={back}>
        <CompleteStepButton step="preview" nextHref={nextHref} label={t("preview.confirm")} />
      </StepActions>
    </div>
  );
}
