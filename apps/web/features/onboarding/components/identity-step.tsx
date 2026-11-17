import type { Locale } from "@app/core/locale";
import { UiLink, buttonVariants } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { IdentityStatus } from "../../verification/components/identity-status";
import type { OnboardingData } from "../queries/load-onboarding";
import { StepActions } from "./step-actions";

/** Schritt «Identität»: Prüfung beim Dienstleister, die Plattform zeigt nur Status und Ergebnis (PRD 11.8, 16.1). */
export async function IdentityStep({ locale, data, next }: { locale: Locale; data: OnboardingData; next: { href: string; label: string } }) {
  const t = await getTranslations({ locale, namespace: "onboarding" });
  const passed = data.identityStatus.kind === "valid";
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body">{t("identity.explainer")}</p>
      <IdentityStatus locale={locale} view={data.identityStatus} providerConfigured={data.providerConfigured} origin="onboarding" />
      <UiLink
        href={getPathname({ href: "/studio/verifizierung", locale })}
        className="self-start text-small text-ink underline underline-offset-4 hover:text-accent"
      >
        {t("identity.viewStatus")}
      </UiLink>
      <StepActions back={null}>
        <UiLink
          href={next.href}
          className={buttonVariants({
            variant: passed ? "primary" : "secondary",
          })}
        >
          <span className="text-center">{next.label}</span>
        </UiLink>
      </StepActions>
    </div>
  );
}
