import { UiLink, cn } from "@app/ui";
import type { ReactNode } from "react";

export interface CollectionTab {
  id: string;
  name: string;
  count: number;
  href: string;
  current: boolean;
}

/**
 * Sammlungen als Tabs (PRD v2 12.1), als Links mit eigener URL. Sie brechen
 * auf schmalen Bildschirmen um, statt seitlich zu scrollen; am Ende steht
 * «Neue Sammlung».
 */
export function CollectionTabs({
  label,
  tabs,
  action,
}: {
  label: string;
  tabs: readonly CollectionTab[];
  action: ReactNode;
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <li key={tab.id} className="min-w-0 max-w-full">
            <UiLink
              href={tab.href}
              aria-current={tab.current ? "page" : undefined}
              data-collection-tab={tab.id}
              className={cn(
                "inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border px-4 text-small transition-colors duration-state",
                tab.current
                  ? "border-ink bg-ink font-[550] text-bg hover:bg-ink/90"
                  : "border-border-strong bg-surface text-ink hover:bg-surface-2",
              )}
            >
              <span className="min-w-0 truncate">{tab.name}</span>
              <span
                className={cn(
                  "tabular",
                  tab.current ? "text-bg" : "text-ink-muted",
                )}
              >
                {tab.count}
              </span>
            </UiLink>
          </li>
        ))}
        <li>{action}</li>
      </ul>
    </nav>
  );
}
