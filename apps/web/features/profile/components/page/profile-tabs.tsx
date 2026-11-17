import { UiLink, cn } from "@app/ui";
import { useTranslations } from "next-intl";

export type ProfileTab = "overview" | "media";

/**
 * Tabs des Profils, der aktive steht in der URL (PRD 13). Bewertungen (1.10)
 * und Beiträge (Phase 3) kommen mit ihren Modulen dazu. Auf Mobile haften sie.
 */
export function ProfileTabs({ current, links }: { current: ProfileTab; links: Record<ProfileTab, string> }) {
  const t = useTranslations("profile.tabs");
  return (
    <nav aria-label={t("label")} className="sticky top-14 z-10 -mx-4 border-b border-border bg-bg px-4 md:static md:mx-0 md:px-0">
      <ul className="flex gap-6 overflow-x-auto">
        {(["overview", "media"] as const).map((tab) => (
          <li key={tab}>
            <UiLink
              href={links[tab]}
              aria-current={current === tab ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center border-b-2 text-body whitespace-nowrap",
                current === tab ? "border-accent font-[550] text-ink" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {t(tab)}
            </UiLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
