"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";

export interface SidebarItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  /** Bedeutung der Zahl für Screenreader, zum Beispiel «3 ungelesen». */
  badgeLabel?: string;
  current?: boolean;
}

export interface StudioSidebarProps {
  label: string;
  items: readonly SidebarItem[];
  /** Profilstatus mit «Pausieren»: auf jeder Studio-Seite an derselben Stelle (PRD 11.1). */
  status: ReactNode;
  secondaryItems: readonly SidebarItem[];
  /** Eingeklappt auf 64 px; wirkt zwischen 1024 und 1279 px, der Zustand wird gemerkt. */
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  labels: { collapse: string; expand: string };
}

/**
 * Seitenleiste des Studios: 232 px, auf Tablets und eingeklappt 64 px mit
 * Tooltips. Sie fährt beim Wechsel ins Studio von links ein (250 ms); die
 * Kopfzeile darüber bewegt sich nicht (PRD 6.1, 6.2).
 */
export function StudioSidebar({ label, items, status, secondaryItems, collapsed, onCollapsedChange, labels }: StudioSidebarProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <aside
        aria-label={label}
        data-studio-sidebar
        data-collapsed={collapsed || undefined}
        className={cn(
          "sticky top-16 hidden h-[calc(100dvh-4rem)] w-16 shrink-0 animate-sidebar-in flex-col overflow-y-auto border-r border-border bg-bg transition-[width] duration-layer md:flex xl:w-58",
          !collapsed && "lg:w-58",
        )}
      >
        <nav aria-label={label} className="flex-1 p-2">
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <SidebarLink key={item.href} item={item} collapsed={collapsed} />
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-2 border-t border-border p-2">
          <div className={cn("hidden xl:block", !collapsed && "lg:block")}>{status}</div>
          <ul className="flex flex-col gap-1">
            {secondaryItems.map((item) => (
              <SidebarLink key={item.href} item={item} collapsed={collapsed} />
            ))}
          </ul>
          <button
            type="button"
            aria-expanded={!collapsed}
            onClick={() => onCollapsedChange(!collapsed)}
            className="hidden min-h-11 items-center gap-3 rounded-control px-3 text-small text-ink-muted hover:bg-surface-2 hover:text-ink lg:flex xl:hidden"
          >
            {collapsed ? <PanelLeftOpen aria-hidden strokeWidth={1.5} className="size-5 shrink-0" /> : <PanelLeftClose aria-hidden strokeWidth={1.5} className="size-5 shrink-0" />}
            <span className={cn(collapsed && "sr-only")}>{collapsed ? labels.expand : labels.collapse}</span>
          </button>
        </div>
      </aside>
    </TooltipPrimitive.Provider>
  );
}

function SidebarLink({ item, collapsed }: { item: SidebarItem; collapsed: boolean }) {
  // Beschriftung: unter 1024 px und eingeklappt nur für Screenreader, sonst sichtbar.
  const labelClass = cn("sr-only min-w-0 flex-1 xl:not-sr-only", !collapsed && "lg:not-sr-only");
  return (
    <li>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <UiLink
            href={item.href}
            aria-current={item.current ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-control px-3 text-small font-[550] transition-colors duration-state [&_svg]:size-5 [&_svg]:shrink-0",
              item.current ? "bg-surface-2 text-accent" : "text-ink hover:bg-surface-2",
            )}
          >
            <span aria-hidden className="contents">
              {item.icon}
            </span>
            <span className={labelClass}>
              {/* Mit Bedeutung der Zahl: ein Textknoten für den Namen («Nachrichten, 3 ungelesen»); die Zahl daneben ist nur zu sehen. */}
              {item.badge && item.badgeLabel ? (
                <>
                  <span aria-hidden>{item.label}</span>
                  <span className="sr-only">{`${item.label}, ${item.badgeLabel}`}</span>
                </>
              ) : (
                item.label
              )}
            </span>
            {item.badge ? (
              <span aria-hidden={item.badgeLabel ? true : undefined} className={cn("tabular rounded-full bg-ink px-2 text-[0.8125rem]/5 text-bg", labelClass, "flex-none")}>
                {item.badgeLabel && item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </UiLink>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="right"
            sideOffset={8}
            aria-hidden
            className={cn("z-50 animate-fade-in rounded-chip bg-ink px-2 py-1 text-small text-bg shadow-raised xl:hidden", !collapsed && "lg:hidden")}
          >
            {item.label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </li>
  );
}
