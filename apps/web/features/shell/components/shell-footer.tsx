import type { Locale } from "@app/core/locale";
import { Footer } from "@app/ui";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { LocaleControl } from "../../appearance/components/locale-control";
import { ThemeControl } from "../../appearance/components/theme-control";
import { THEME_COOKIE, parseTheme } from "../../appearance/theme";
import { createHref } from "../nav/href";
import { getShellData } from "../queries/get-shell-data";

/** Footer des Marktplatz-Modus. Im Studio gibt es keinen Footer (PRD 6.2). */
export async function ShellFooter({ locale }: { locale: Locale }) {
  const [t, data, cookieStore] = await Promise.all([getTranslations({ locale, namespace: "footer" }), getShellData(locale), cookies()]);
  const href = createHref(locale);
  return (
    <Footer
      label={t("label")}
      legalNote={t("legalNote")}
      groups={[
        {
          heading: t("regions"),
          links: [
            ...data.regions.map((region) => ({
              label: region.name,
              href:
                region.kind === "CITY" && region.cantonSlug
                  ? href({ pathname: "/ch/[kanton]/[stadt]", params: { kanton: region.cantonSlug, stadt: region.slug } })
                  : href({ pathname: "/ch/[kanton]", params: { kanton: region.slug } }),
            })),
            { label: t("allCantons"), href: href("/ch") },
          ],
        },
        {
          heading: t("safety"),
          links: [
            { label: t("howSafetyWorks"), href: href("/sicherheit") },
            { label: t("report"), href: href("/melden") },
            { label: t("guidelines"), href: href("/recht/richtlinien") },
          ],
        },
        {
          heading: t("help"),
          links: [
            { label: t("helpCentre"), href: href("/hilfe") },
            { label: t("contact"), href: href("/kontakt") },
            { label: t("forProviders"), href: href("/fuer-anbieter") },
            { label: t("forClubs"), href: href("/fuer-clubs") },
            { label: t("about"), href: href("/ueber-uns") },
          ],
        },
        {
          heading: t("legal"),
          links: [
            { label: t("terms"), href: href("/recht/agb") },
            { label: t("privacy"), href: href("/recht/datenschutz") },
            { label: t("imprint"), href: href("/recht/impressum") },
          ],
        },
      ]}
      controls={
        <>
          <LocaleControl current={locale} label={t("language")} names={{ de: "Deutsch", fr: "Français", it: "Italiano", en: "English" }} />
          <ThemeControl
            initial={parseTheme(cookieStore.get(THEME_COOKIE)?.value)}
            label={t("appearance")}
            options={{ system: t("themeSystem"), light: t("themeLight"), dark: t("themeDark") }}
          />
        </>
      }
    />
  );
}
