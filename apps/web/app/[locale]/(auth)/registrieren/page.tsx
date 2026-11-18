import { safeReturnPath } from "@app/core/age-gate";
import type { Locale } from "@app/core/locale";
import { isMailConfigured } from "@app/core/mail";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthColumn, AuthIntro } from "@/features/auth/components/auth-intro";
import { RegisterForm } from "@/features/auth/components/register-form";
import { RegistrationClosed } from "@/features/auth/components/registration-closed";
import { getPathname } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/registrieren">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "auth.register" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/**
 * Registrierung (PRD 7.4). Ohne eingerichteten Versand ist sie geschlossen und sagt das.
 * `?weiter=` aus der Anmeldung bleibt über die Bestätigung der E-Mail erhalten (PRD v2 8.2).
 */
export default async function RegisterPage({ params, searchParams }: PageProps<"/[locale]/registrieren">) {
  const locale = (await params).locale as Locale;
  const { weiter } = await searchParams;
  const returnTo = typeof weiter === "string" ? safeReturnPath(weiter, "") || undefined : undefined;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthColumn>
      <AuthIntro title={t("register.title")} intro={t("register.intro")} help={{ href: getPathname({ href: "/hilfe", locale }), label: t("help") }} />
      {isMailConfigured() ? <RegisterForm locale={locale} returnTo={returnTo} /> : <RegistrationClosed locale={locale} />}
    </AuthColumn>
  );
}
