"use client";

import { UiLink, cn } from "@app/ui";
import { usePathname } from "next/navigation";

export interface SettingsNavProps {
  label: string;
  items: readonly { key: string; href: string; label: string }[];
  className?: string;
}

/** Abschnitte der Einstellungen. Der aktuelle trägt `aria-current="page"`. */
export function SettingsNav({ label, items, className }: SettingsNavProps) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const current = pathname === item.href;
          return (
            <li key={item.key}>
              <UiLink
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-control px-3 text-body transition-colors duration-state hover:bg-surface-2",
                  current ? "bg-surface-2 font-[550] text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
              </UiLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
