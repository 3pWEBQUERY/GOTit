import { getOwnPreferences } from "@app/core/account";
import { LOCALES, type Locale } from "@app/core/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { requireAccount } from "@/features/account/require-account";
import { MOTION_COOKIE, NEUTRAL_TITLE_COOKIE } from "@/features/appearance/preference-cookies";
import { THEME_COOKIE, parseTheme } from "@/features/appearance/theme";
import { AppearanceSettings } from "@/features/settings/appearance/appearance-settings";
import { SettingsHeader } from "@/features/settings/components/settings-header";
import { getPathname } from "@/i18n/navigation";

const APP_NAME = process.env.APP_NAME ?? "GOTit";
const LOCALE_NAMES: Record<Locale, string> = { de: "Deutsch", fr: "Français", it: "Italiano", en: "English" };

export async function generateMetadata({ params }: PageProps<"/[locale]/einstellungen/darstellung">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "settings" });
  return { title: t("appearance.metaTitle") };
}

export default async function AppearanceSettingsPage({ params }: PageProps<"/[locale]/einstellungen/darstellung">) {
  const locale = (await params).locale as Locale;
  const viewer = await requireAccount(locale);
  const [t, common, preferences, store] = await Promise.all([
    getTranslations({ locale, namespace: "settings" }),
    getTranslations({ locale, namespace: "common" }),
    getOwnPreferences(viewer.userId),
    cookies(),
  ]);
  const localeHrefs = Object.fromEntries(LOCALES.map((target) => [target, getPathname({ href: "/einstellungen/darstellung", locale: target })])) as Record<Locale, string>;
  // Das Dokument zeigt, was die Cookies sagen; das Konto ist die Quelle, wenn noch kein Cookie gesetzt ist.
  const theme = store.get(THEME_COOKIE) ? parseTheme(store.get(THEME_COOKIE)?.value) : preferences.theme;
  const reducedMotion = store.get(MOTION_COOKIE) ? store.get(MOTION_COOKIE)?.value === "reduced" : preferences.reducedMotion;
  const neutralTabTitle = store.get(NEUTRAL_TITLE_COOKIE) ? store.get(NEUTRAL_TITLE_COOKIE)?.value === "1" : preferences.neutralTabTitle;
  return (
    <>
      <SettingsHeader title={t("appearance.metaTitle")} intro={t("appearance.intro")} />
      <AppearanceSettings
        locale={locale}
        localeHrefs={localeHrefs}
        localeNames={LOCALE_NAMES}
        theme={theme}
        reducedMotion={reducedMotion}
        neutralTabTitle={neutralTabTitle}
        titles={{ neutral: common("neutralTitle"), regular: `${t("appearance.metaTitle")} · ${APP_NAME}` }}
      />
    </>
  );
}
