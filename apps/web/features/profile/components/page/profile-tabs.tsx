import { UiLink, cn } from "@app/ui";
import { useTranslations } from "next-intl";

export type ProfileTab = "overview" | "media" | "reviews";

/**
 * Tabs des Profils, der aktive steht in der URL (PRD 13). Beiträge (Phase 3)
 * kommen mit ihrem Modul dazu. Auf Mobile haften sie. Der Tab «Bewertungen»
 * nennt die Zahl der veröffentlichten Bewertungen (Entscheid 0017).
 */
export function ProfileTabs({
  current,
  links,
  reviewCount,
}: {
  current: ProfileTab;
  links: Record<ProfileTab, string>;
  reviewCount: number;
}) {
  const t = useTranslations("profile.tabs");
  return (
    <nav
      aria-label={t("label")}
      className="sticky top-14 z-10 -mx-4 border-b border-border bg-bg px-4 md:static md:mx-0 md:px-0"
    >
      <ul className="flex gap-6 overflow-x-auto">
        {(["overview", "media", "reviews"] as const).map((tab) => (
          <li key={tab}>
            <UiLink
              href={links[tab]}
              aria-current={current === tab ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center border-b-2 text-body whitespace-nowrap",
                current === tab
                  ? "border-accent font-[550] text-ink"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {t(tab)}
              {tab === "reviews" && reviewCount > 0 ? (
                <>
                  {" "}
                  <span className="tabular ml-1 text-ink-muted">
                    {reviewCount}
                  </span>
                </>
              ) : null}
            </UiLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
