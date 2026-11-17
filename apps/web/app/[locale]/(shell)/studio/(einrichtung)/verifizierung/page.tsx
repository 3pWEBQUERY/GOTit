import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAccount } from "@/features/account/require-account";
import { TopBarTitle } from "@/features/shell/components/top-bar-title";
import { VerificationOverview } from "@/features/verification/components/verification-overview";
import { loadVerification } from "@/features/verification/queries/load-verification";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: (await params).locale as Locale,
    namespace: "onboarding.verification",
  });
  return { title: t("metaTitle") };
}

/** Status der Identitätsprüfung mit Ablaufdatum und erneuter Prüfung (PRD 7.6), auch nach der Freigabe. */
export default async function VerificationPage({ params }: Props) {
  const locale = (await params).locale as Locale;
  const viewer = await requireAccount(locale);
  if (!viewer.provider || viewer.provider.status === "ARCHIVED") return redirect({ href: "/fuer-anbieter", locale });
  const [t, data] = await Promise.all([getTranslations({ locale, namespace: "onboarding.verification" }), loadVerification(viewer.userId)]);
  return (
    <div className="flex max-w-reading flex-col gap-6">
      <TopBarTitle title={t("title")} />
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-body text-ink-muted">{t("intro")}</p>
      </header>
      <VerificationOverview locale={locale} data={data} status={viewer.provider.status} />
    </div>
  );
}
