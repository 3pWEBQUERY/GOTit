import type { Locale } from "@app/core/locale";
import type { OnboardingStepKey } from "@app/core/onboarding/schemas";
import { EmptyState, UiLink, buttonVariants } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { listApprovedRegions } from "../queries/list-approved-regions";
import type { OnboardingData } from "../queries/load-onboarding";
import { stepHref } from "../step-href";
import { neighbours } from "../steps";
import { IdentityStep } from "./identity-step";
import { InfoStep } from "./info-step";
import { OfferForm } from "./offer-form";
import { PreviewStep } from "./preview-step";
import { ProfileForm } from "./profile-form";
import { RegionsForm } from "./regions-form";
import { SubmitStep } from "./submit-step";

/** Inhalt eines Schritts mit «Zurück» zum vorigen und dem Ziel nach dem Speichern. */
export async function StepContent({ locale, step, data }: { locale: Locale; step: OnboardingStepKey; data: OnboardingData }) {
  const t = await getTranslations({ locale, namespace: "onboarding" });
  const { previous, next } = neighbours(step);
  const back = previous
    ? {
        href: stepHref(locale, previous),
        label: t("nav.back", { step: t(`steps.${previous}.name`) }),
      }
    : null;
  const nextHref = stepHref(locale, next ?? "submit");
  const { profile } = data;

  switch (step) {
    case "identity":
      return (
        <IdentityStep
          locale={locale}
          data={data}
          next={{
            href: nextHref,
            label: t("nav.continueTo", {
              step: t(`steps.${next ?? "submit"}.name`),
            }),
          }}
        />
      );
    case "regions": {
      const regions = await listApprovedRegions(locale);
      if (regions.cantons.length === 0 && regions.looseCities.length === 0) {
        return (
          <EmptyState
            title={t("regions.empty")}
            action={
              <UiLink href={getPathname({ href: "/studio", locale })} className={buttonVariants({ variant: "secondary" })}>
                {t("regions.toStudio")}
              </UiLink>
            }
          />
        );
      }
      return (
        <div className="flex flex-col gap-6">
          <p className="text-body">{t("regions.intro")}</p>
          <p className="border-l-2 border-border-strong pl-3 text-small text-ink-muted">{t("regions.privacy")}</p>
          <RegionsForm
            cantons={regions.cantons}
            looseCities={regions.looseCities}
            initial={profile.regions.map((entry) => entry.regionId)}
            nextHref={nextHref}
            back={back}
          />
        </div>
      );
    }
    case "profile":
      return (
        <div className="flex flex-col gap-6">
          <p className="text-body">{t("profile.intro")}</p>
          <ProfileForm
            initial={{
              displayName: profile.displayName,
              description: profile.description ?? "",
              languages: profile.languages,
            }}
            nextHref={nextHref}
            back={back}
          />
        </div>
      );
    case "media":
    case "availability":
      return <InfoStep locale={locale} step={step} nextHref={nextHref} back={back} />;
    case "offer":
      return (
        <div className="flex flex-col gap-6">
          <p className="text-body">{t("offer.intro")}</p>
          <OfferForm initial={profile.rates} nextHref={nextHref} back={back} />
        </div>
      );
    case "preview":
      return (
        <PreviewStep
          locale={locale}
          data={data}
          regions={await listApprovedRegions(locale)}
          selfHref={stepHref(locale, "preview")}
          nextHref={nextHref}
          back={back}
        />
      );
    case "submit":
      return <SubmitStep locale={locale} data={data} back={back} />;
  }
}
