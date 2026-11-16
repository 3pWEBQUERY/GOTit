import { safeReturnPath } from "@app/core/age-gate";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthColumn, AuthIntro } from "@/features/auth/components/auth-intro";
import { TwoFactorForm } from "@/features/auth/components/two-factor-form";
import { getPathname } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/anmelden/2fa">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "auth.twoFactor" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Zweiter Faktor nach E-Mail und Passwort (PRD 7.4). */
export default async function TwoFactorPage({ params, searchParams }: PageProps<"/[locale]/anmelden/2fa">) {
  const locale = (await params).locale as Locale;
  const { weiter } = await searchParams;
  const t = await getTranslations({ locale, namespace: "auth" });
  const target = safeReturnPath(typeof weiter === "string" ? weiter : null, getPathname({ href: "/", locale }));
  const query = typeof weiter === "string" ? { weiter: target } : undefined;
  return (
    <AuthColumn>
      <AuthIntro title={t("twoFactor.title")} help={{ href: getPathname({ href: "/hilfe", locale }), label: t("help") }} />
      <TwoFactorForm target={target} signInHref={getPathname({ href: { pathname: "/anmelden", query }, locale })} />
    </AuthColumn>
  );
}
