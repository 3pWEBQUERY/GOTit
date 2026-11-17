import type { Locale } from "@app/core/locale";
import { InlineAlert, UiLink, buttonVariants } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { TopBarTitle } from "../../shell/components/top-bar-title";
import type { OnboardingData } from "../queries/load-onboarding";

/** Gesperrtes Profil: keine Bearbeitung, eine Erklärung und der Weg zum Studio. */
export async function SuspendedNotice({ locale, data }: { locale: Locale; data: OnboardingData }) {
  const t = await getTranslations({ locale, namespace: "onboarding.access" });
  const underAge = data.identityStatus.kind === "rejected" && data.identityStatus.reason === "under-age";
  return (
    <div data-onboarding-suspended className="flex max-w-reading flex-col gap-6">
      <TopBarTitle title={t("suspendedTitle")} />
      <h1 className="text-h1">{t("suspendedTitle")}</h1>
      <InlineAlert tone="error" title={underAge ? t("underAge") : t("suspendedText")}>
        {underAge ? t("suspendedText") : null}
      </InlineAlert>
      <UiLink href={getPathname({ href: "/studio", locale })} className={`${buttonVariants({ variant: "secondary" })} self-start`}>
        {t("toStudio")}
      </UiLink>
    </div>
  );
}
