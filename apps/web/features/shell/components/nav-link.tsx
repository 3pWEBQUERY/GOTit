"use client";

import { UiLink, cn } from "@app/ui";
import { usePathname } from "next/navigation";
import { isCurrentPath } from "../nav/is-current";

/** Einfacher Punkt der Hauptnavigation («Profile», «Clubs») mit Markierung der aktuellen Seite. */
export function NavLink({ href, label }: { href: string; label: string }) {
  const current = isCurrentPath(usePathname(), href, []);
  return (
    <UiLink
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "relative inline-flex min-h-10 items-center rounded-control px-3 text-small font-[550] transition-colors duration-state",
        current
          ? "text-ink after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-ink"
          : "text-ink-muted hover:text-ink",
      )}
    >
      {label}
    </UiLink>
  );
}
