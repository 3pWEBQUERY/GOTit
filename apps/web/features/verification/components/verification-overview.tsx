import type { Locale } from "@app/core/locale";
import type { ProviderStatus } from "@app/db";
import { UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import type { VerificationData } from "../queries/load-verification";
import { IdentityStatus } from "./identity-status";

/** Inhalt von `/studio/verifizierung`: Erklärung, Status und der Weg zurück. */
export async function VerificationOverview({ locale, data, status }: { locale: Locale; data: VerificationData; status: ProviderStatus }) {
  const t = await getTranslations({ locale, namespace: "onboarding" });
  const inOnboarding = status === "DRAFT" || status === "CHANGES_REQUESTED";
  return (
    <>
      <p className="text-body">{t("identity.explainer")}</p>
      <IdentityStatus locale={locale} view={data.view} providerConfigured={data.providerConfigured} origin="verification" />
      <UiLink
        href={inOnboarding ? getPathname({ href: "/studio/start", locale }) : getPathname({ href: "/studio", locale })}
        className="inline-flex min-h-11 items-center self-start text-body text-ink underline underline-offset-4 hover:text-accent"
      >
        {inOnboarding ? t("verification.toOnboarding") : t("verification.toToday")}
      </UiLink>
    </>
  );
}
