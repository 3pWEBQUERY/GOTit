"use client";

import { GlassTabBar, Sheet, SheetContent, UiLink, type SidebarItem, type TabBarItem } from "@app/ui";
import { Ellipsis } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { isCurrentPath, isStudioPath } from "../nav/is-current";
import type { TabBarSets } from "../nav/tab-bar";

export interface MobileTabBarProps {
  label: string;
  sets: TabBarSets;
  account: boolean;
  /** Inhalt des Sheets «Mehr» im Studio; null, wenn das Konto kein Studio hat. */
  more: {
    label: string;
    title: string;
    closeLabel: string;
    handleLabel: string;
    links: readonly SidebarItem[];
    status: ReactNode;
  } | null;
}

/**
 * Mobile Tab-Leiste: Besucher, Mitglied oder Studio (PRD 6.4). Der Moduswechsel
 * tauscht die Tabs mit einer Überblendung; die Leiste selbst bleibt stehen.
 */
export function MobileTabBar({ label, sets, account, more }: MobileTabBarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const studio = more !== null && isStudioPath(pathname);
  const mode = studio ? "studio" : account ? "member" : "visitor";
  const base = sets[mode];
  const roots = base.flatMap((item) => (item.href ? [item.href] : [])).slice(0, 1);
  const items: TabBarItem[] = base.map((item) => ({ ...item, current: item.href ? isCurrentPath(pathname, item.href, roots) : false }));
  if (studio) items.push({ key: "more", label: more.label, icon: <Ellipsis strokeWidth={1.5} />, onSelect: () => setMoreOpen(true) });

  return (
    <>
      <GlassTabBar label={label} items={items} mode={mode} />
      {more ? (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent title={more.title} closeLabel={more.closeLabel} handleLabel={more.handleLabel} defaultDetent="full">
            <ul className="pb-4">
              {more.links.map((link) => (
                <li key={link.href}>
                  <UiLink
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-control px-2 text-body text-ink hover:bg-surface-2 [&_svg]:size-5"
                  >
                    <span aria-hidden className="contents">
                      {link.icon}
                    </span>
                    {link.label}
                  </UiLink>
                </li>
              ))}
            </ul>
            <div className="border-t border-border py-4">{more.status}</div>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}
