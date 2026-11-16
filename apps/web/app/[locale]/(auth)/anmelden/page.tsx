import { safeReturnPath } from "@app/core/age-gate";
import type { Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthColumn, AuthIntro } from "@/features/auth/components/auth-intro";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getPathname } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/anmelden">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "auth.signIn" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Anmeldung (PRD 7.4). `?weiter=` bleibt erhalten, auch über den zweiten Faktor (PRD 8.2). */
export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/anmelden">) {
  const locale = (await params).locale as Locale;
  const { weiter } = await searchParams;
  const t = await getTranslations({ locale, namespace: "auth" });
  const target = safeReturnPath(typeof weiter === "string" ? weiter : null, getPathname({ href: "/", locale }));
  const query = typeof weiter === "string" ? { weiter: target } : undefined;
  const links = {
    target,
    twoFactor: getPathname({ href: { pathname: "/anmelden/2fa", query }, locale }),
    forgotPassword: getPathname({ href: "/passwort/vergessen", locale }),
    register: getPathname({ href: "/registrieren", locale }),
    verifyCallback: getPathname({ href: { pathname: "/registrieren/bestaetigen", query: { status: "bestaetigt" } }, locale }),
  };
  return (
    <AuthColumn>
      <AuthIntro title={t("signIn.title")} help={{ href: getPathname({ href: "/hilfe", locale }), label: t("help") }} />
      <SignInForm links={links} />
    </AuthColumn>
  );
}
