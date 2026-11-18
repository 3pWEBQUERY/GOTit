import { SkipLink, UiLink } from "@app/ui";
import { CalendarCheck, MessageCircle, ShieldCheck, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@app/core/locale";

const APP_NAME = process.env.APP_NAME ?? "TheGND";

/**
 * Schlanker Rahmen für Anmeldung und Altersprüfung: ohne Navigation, mit Weg
 * zurück. Ab 1024 px links eine dunkle Fläche mit Leitsatz und Merkmalen der
 * Plattform (Entscheid 0025), rechts das Formular.
 */
export default async function AuthLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  const [t, tDiscover] = await Promise.all([getTranslations({ locale, namespace: "shell" }), getTranslations({ locale, namespace: "discover" })]);
  const home = getPathname({ href: "/", locale });
  const features = [
    { key: "identity", label: tDiscover("hero.identity"), icon: ShieldCheck },
    { key: "booking", label: tDiscover("hero.booking"), icon: CalendarCheck },
    { key: "messenger", label: tDiscover("hero.messenger"), icon: MessageCircle },
    { key: "reviews", label: tDiscover("hero.reviews"), icon: Star },
  ];
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-12">
      <SkipLink href="#inhalt">{t("skipToContent")}</SkipLink>
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between bg-surface p-12 text-ink scheme-dark lg:col-span-5 lg:flex">
        <UiLink href={home} className="inline-flex min-h-11 items-center self-start text-h2 text-ink">
          {APP_NAME}
        </UiLink>
        <div className="flex flex-col gap-6">
          <p className="text-eyebrow text-ink-muted">{tDiscover("hero.eyebrow")}</p>
          <p className="text-display text-balance">{t("authTitle")}</p>
          <p className="max-w-reading text-body text-ink-muted">{tDiscover("hero.lead")}</p>
        </div>
        <ul aria-label={tDiscover("hero.features")} className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-6">
          {features.map(({ key, label, icon: Icon }) => (
            <li key={key} className="flex items-center gap-2 text-small text-ink">
              <Icon aria-hidden strokeWidth={1.5} className="size-5 shrink-0 text-ink-muted" />
              <span className="min-w-0">{label}</span>
            </li>
          ))}
        </ul>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col lg:col-span-7">
        <header className="flex h-16 items-center bg-surface px-4 text-ink scheme-dark md:px-6 lg:hidden">
          <UiLink href={home} className="inline-flex min-h-11 items-center text-h2 text-ink">
            {APP_NAME}
          </UiLink>
        </header>
        <main id="inhalt" tabIndex={-1} className="mx-auto w-full max-w-content flex-1 px-4 py-8 outline-none md:px-6 lg:flex lg:flex-col lg:justify-center lg:py-16">
          {children}
        </main>
      </div>
    </div>
  );
}
