import type { Locale } from "@app/core/locale";
import { UiLink, cn } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";

/** Zwei Ansichten der Moderation als Links; die aktive steht in der URL (PRD 13, Tabs). */
export async function ModerationTabs({ locale, current }: { locale: Locale; current: "faelle" | "sperren" }) {
  const t = await getTranslations({ locale, namespace: "moderation.tabs" });
  const href = createHref(locale);
  const tabs = [
    { key: "faelle", label: t("cases"), href: href("/admin/moderation") },
    { key: "sperren", label: t("restrictionAppeals"), href: href({ pathname: "/admin/moderation", query: { ansicht: "sperren" } }) },
  ] as const;
  return (
    <nav aria-label={t("label")} className="border-b border-border">
      <ul className="flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <li key={tab.key}>
            <UiLink
              href={tab.href}
              aria-current={tab.key === current ? "page" : undefined}
              className={cn(
                "-mb-px flex min-h-10 items-center border-b-2 px-3 text-small transition-colors duration-state",
                tab.key === current ? "border-accent font-[550] text-ink" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {tab.label}
            </UiLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
