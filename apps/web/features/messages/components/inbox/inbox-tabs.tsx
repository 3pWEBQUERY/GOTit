import type { InboxView } from "@app/core/messaging/schemas";
import { UiLink, cn } from "@app/ui";
import { Star } from "lucide-react";

export interface InboxTab {
  view: InboxView;
  label: string;
  href: string;
  current: boolean;
}

/**
 * Ansichten des Postfachs (v1 FR-CHAT-002) als Links mit eigener URL (PRD 13,
 * Tabs). Sie brechen auf schmalen Spalten um, statt seitlich zu scrollen.
 */
export function InboxTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: readonly InboxTab[];
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <li key={tab.view}>
            <UiLink
              href={tab.href}
              aria-current={tab.current ? "page" : undefined}
              data-inbox-view={tab.view}
              className={cn(
                "inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-small transition-colors duration-state",
                tab.current
                  ? "border-ink bg-ink font-[550] text-bg hover:bg-ink/90"
                  : "border-border-strong bg-surface text-ink hover:bg-surface-2",
              )}
            >
              {tab.view === "favoriten" ? (
                <Star
                  aria-hidden
                  strokeWidth={1.5}
                  className="size-4 shrink-0"
                />
              ) : null}
              {tab.label}
            </UiLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
