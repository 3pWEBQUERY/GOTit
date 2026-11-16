import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthColumn, AuthIntro } from "@/features/auth/components/auth-intro";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { getPathname } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/passwort/vergessen">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "auth.forgot" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Passwort vergessen (PRD 7.4). Der Link führt zu `/passwort/neu` in derselben Sprache. */
export default async function ForgotPasswordPage({ params }: PageProps<"/[locale]/passwort/vergessen">) {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthColumn>
      <AuthIntro title={t("forgot.title")} intro={t("forgot.intro")} help={{ href: getPathname({ href: "/hilfe", locale }), label: t("help") }} />
      <ForgotPasswordForm redirectTo={getPathname({ href: "/passwort/neu", locale })} signInHref={getPathname({ href: "/anmelden", locale })} />
    </AuthColumn>
  );
}
