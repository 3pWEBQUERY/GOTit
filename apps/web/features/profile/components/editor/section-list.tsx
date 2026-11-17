import { PROFILE_SECTIONS, type ProfileSection, type SectionStatus } from "@app/core/provider-profile/schemas";
import { UiLink, cn } from "@app/ui";
import { Check, ChevronRight, CircleDashed, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

export interface SectionListProps {
  statuses: Record<ProfileSection, SectionStatus>;
  links: Record<ProfileSection, string>;
  current: ProfileSection | null;
  /** Abschnitte mit wartender Änderung. */
  pending: readonly ProfileSection[];
  className?: string;
}

const ICON: Record<SectionStatus, typeof Check> = { complete: Check, missing: CircleDashed, later: Clock };

/** Abschnitte mit Stand als Icon und Wort, nie nur als Farbe (PRD v2 11.2). Auf Mobile die erste Ebene. */
export function SectionList({ statuses, links, current, pending, className }: SectionListProps) {
  const t = useTranslations("profile.editor");
  return (
    <nav aria-label={t("sectionsLabel")} className={className}>
      <ul className="flex flex-col border-t border-border">
        {PROFILE_SECTIONS.map((section) => {
          const status = statuses[section];
          const Icon = ICON[status];
          return (
            <li key={section} className="border-b border-border">
              <UiLink
                href={links[section]}
                aria-current={current === section ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-3 px-2 text-body text-ink hover:bg-surface-2",
                  current === section && "bg-surface-2 font-[550]",
                )}
              >
                <span className="min-w-0 flex-1">{t(`section.${section}`)}</span>
                <span className="flex items-center gap-1 text-small text-ink-muted">
                  <Icon aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
                  {pending.includes(section) ? t("status.pending") : t(`status.${status}`)}
                </span>
                <ChevronRight aria-hidden strokeWidth={1.5} className="size-4 shrink-0 text-ink-muted" />
              </UiLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
