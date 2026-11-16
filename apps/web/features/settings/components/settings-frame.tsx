import type { Locale } from "@app/core/locale";
import { UiLink } from "@app/ui";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { createHref } from "../../shell/nav/href";
import { settingsLinks } from "../nav";
import { SettingsNav } from "./settings-nav";

/**
 * Rahmen der Einstellungen (PRD 12.1): ab 768 px zweispaltig mit den
 * Abschnitten links. Darunter zweistufig: die Liste der Abschnitte steht auf
 * `/ich`, jeder Abschnitt führt dorthin zurück.
 */
export async function SettingsFrame({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = await getTranslations({ locale, namespace: "settings" });
  const href = createHref(locale);
  const items = settingsLinks(href, (section) => t(`sections.${section}`));
  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
      <div className="hidden md:block">
        <div className="sticky top-24 flex flex-col gap-2">
          <p className="px-3 text-label text-ink-muted">{t("title")}</p>
          <SettingsNav label={t("title")} items={items} />
        </div>
      </div>
      <UiLink
        href={`${href("/ich")}#einstellungen`}
        className="inline-flex min-h-11 items-center gap-1 self-start text-small font-[550] text-ink hover:text-accent md:hidden"
      >
        <ChevronLeft aria-hidden strokeWidth={1.5} className="size-[1.125rem]" />
        {t("allSettings")}
      </UiLink>
      <div className="flex min-w-0 max-w-reading flex-col gap-8">{children}</div>
    </div>
  );
}
