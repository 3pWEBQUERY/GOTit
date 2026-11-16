import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthColumn, AuthIntro } from "@/features/auth/components/auth-intro";
import { CheckInbox } from "@/features/auth/components/check-inbox";
import { EmailVerified } from "@/features/auth/components/email-verified";
import { ResendVerification } from "@/features/auth/components/resend-verification";
import { getPathname } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/registrieren/bestaetigen">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "auth.confirm" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/**
 * Bestätigung der E-Mail-Adresse: «Prüfe dein Postfach», nach dem Link
 * `?status=bestaetigt`, bei abgelaufenem oder ungültigem Link `?error=…`.
 */
export default async function ConfirmEmailPage({ params, searchParams }: PageProps<"/[locale]/registrieren/bestaetigen">) {
  const locale = (await params).locale as Locale;
  const { status, error } = await searchParams;
  const t = await getTranslations({ locale, namespace: "auth.confirm" });
  const callbackURL = getPathname({ href: { pathname: "/registrieren/bestaetigen", query: { status: "bestaetigt" } }, locale });

  if (error) {
    return (
      <AuthColumn>
        <AuthIntro title={t("invalid.title")} intro={t("invalid.body")} />
        <ResendVerification callbackURL={callbackURL} idPrefix="confirm-invalid" />
      </AuthColumn>
    );
  }
  if (status === "bestaetigt") {
    return (
      <AuthColumn>
        <AuthIntro title={t("verified.title")} />
        <EmailVerified locale={locale} />
      </AuthColumn>
    );
  }
  return (
    <AuthColumn>
      <AuthIntro title={t("inbox.title")} />
      <CheckInbox callbackURL={callbackURL} />
    </AuthColumn>
  );
}
