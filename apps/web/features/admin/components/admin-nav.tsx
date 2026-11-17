"use client";

import { UiLink, cn } from "@app/ui";
import { usePathname } from "next/navigation";
import { isCurrentPath } from "../../shell/nav/is-current";

export interface AdminNavItem {
  key: string;
  href: string;
  label: string;
  /** Offene Fälle; erscheint als Zahl neben dem Bereich. */
  count?: { value: number; label: string };
}

/**
 * Seitenleiste des Admins (PRD 7.8, 12.4). Sie zeigt nur gebaute Bereiche;
 * weitere erscheinen mit ihrem Schritt. Die Übersicht gilt nur exakt.
 */
export function AdminNav({ label, items, root }: { label: string; items: readonly AdminNavItem[]; root: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-1 lg:flex-col">
        {items.map((item) => {
          const current = isCurrentPath(pathname, item.href, [root]);
          return (
            <li key={item.key}>
              <UiLink
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center justify-between gap-3 rounded-control px-3 text-small transition-colors duration-state hover:bg-surface-2",
                  current ? "bg-surface-2 font-[550] text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                <span>{item.label}</span>
                {item.count ? (
                  <span className="tabular text-small text-ink-muted">
                    <span aria-hidden>{item.count.value}</span>
                    <span className="sr-only">{item.count.label}</span>
                  </span>
                ) : null}
              </UiLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
