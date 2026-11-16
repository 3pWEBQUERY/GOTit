"use client";

import type { MouseEvent, ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";
import { useScrolledDown } from "./use-scroll-direction";

export interface TabBarItem {
  key: string;
  label: string;
  icon: ReactNode;
  /** Wurzel des Tabs. Fehlt sie, ist der Eintrag ein Button (zum Beispiel «Mehr»). */
  href?: string;
  onSelect?: () => void;
  current?: boolean;
  badge?: number;
}

export interface GlassTabBarProps {
  label: string;
  items: readonly TabBarItem[];
  /** Wechselt mit dem Modus; löst die Überblendung der Tabs aus. */
  mode: string;
}

const itemClass =
  "relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 text-ink-muted transition-colors duration-state aria-[current=page]:text-accent [&_svg]:size-5";

/**
 * Schwebende Tab-Leiste aus Glas (PRD 5.5, 6.4): Kapsel 12 px vom Rand über der
 * Safe Area. Schrumpft beim Scrollen nach unten auf Icons und kommt beim
 * Scrollen nach oben zurück. Tippen auf den aktiven Tab scrollt nach oben, ein
 * zweites Tippen führt zur Wurzel des Tabs.
 */
export function GlassTabBar({ label, items, mode }: GlassTabBarProps) {
  const compact = useScrolledDown();

  function onActiveTap(event: MouseEvent) {
    if (window.scrollY <= 0) return;
    event.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <nav
      aria-label={label}
      data-glass-tab-bar
      data-compact={compact || undefined}
      className={cn(
        "glass fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-full p-1 transition-[max-width] duration-layer md:hidden",
        compact ? "max-w-72" : "max-w-content",
      )}
    >
      <ul key={mode} className="flex animate-fade-in items-stretch">
        {items.map((item) => {
          const content = (
            <>
              <span aria-hidden className="contents">
                {item.icon}
              </span>
              <span className={cn("text-[0.8125rem]/4 font-[550]", compact && "sr-only")}>{item.label}</span>
              {item.badge ? (
                <span className="tabular absolute top-1 left-1/2 ml-2 min-w-4 rounded-full bg-ink px-1 text-center text-[0.8125rem]/4 text-bg">
                  <span className="sr-only">, </span>
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </>
          );
          return (
            <li key={item.key} className="flex flex-1">
              {item.href ? (
                <UiLink href={item.href} aria-current={item.current ? "page" : undefined} onClick={item.current ? onActiveTap : undefined} className={itemClass}>
                  {content}
                </UiLink>
              ) : (
                <button type="button" onClick={item.onSelect} className={itemClass}>
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
