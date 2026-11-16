import { SkipLink, UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@app/core/locale";

const APP_NAME = process.env.APP_NAME ?? "GOTit";

/** Schlanker Rahmen für Anmeldung und Altersprüfung: ohne Navigation, mit Weg zurück. */
export default async function AuthLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "shell" });
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink href="#inhalt">{t("skipToContent")}</SkipLink>
      <header className="mx-auto flex h-16 w-full max-w-content items-center px-4 md:px-6">
        <UiLink href={getPathname({ href: "/", locale })} className="inline-flex min-h-11 items-center text-h3 text-ink">
          {APP_NAME}
        </UiLink>
      </header>
      <main id="inhalt" tabIndex={-1} className="mx-auto w-full max-w-content flex-1 px-4 py-8 outline-none md:px-6">
        {children}
      </main>
    </div>
  );
}
