import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthColumn, AuthIntro } from "@/features/auth/components/auth-intro";
import { InvalidResetLink } from "@/features/auth/components/invalid-reset-link";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getPathname } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/passwort/neu">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "auth.reset" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Neues Passwort über den Link aus der E-Mail. Better Auth hängt `?token=` oder `?error=` an. */
export default async function ResetPasswordPage({ params, searchParams }: PageProps<"/[locale]/passwort/neu">) {
  const locale = (await params).locale as Locale;
  const { token, error } = await searchParams;
  const t = await getTranslations({ locale, namespace: "auth.reset" });
  const forgotHref = getPathname({ href: "/passwort/vergessen", locale });
  const valid = typeof token === "string" && token.length > 0 && !error;
  return (
    <AuthColumn>
      <AuthIntro title={t("title")} intro={valid ? t("intro") : undefined} />
      {valid ? (
        <ResetPasswordForm token={token} forgotHref={forgotHref} signInHref={getPathname({ href: "/anmelden", locale })} />
      ) : (
        <InvalidResetLink forgotHref={forgotHref} />
      )}
    </AuthColumn>
  );
}
