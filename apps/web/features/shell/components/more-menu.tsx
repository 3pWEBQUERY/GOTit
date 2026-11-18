"use client";

import { Menu, MenuContent, MenuItem, MenuTrigger, UiLink, type MegaMenuLink } from "@app/ui";
import { ChevronDown } from "lucide-react";

/** «Mehr» ist ein einfaches Menü, kein Mega-Menü (PRD 6.3). */
export function MoreMenu({ label, links }: { label: string; links: readonly MegaMenuLink[] }) {
  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-1 rounded-control px-3 text-small font-[550] text-ink-muted transition-colors duration-state hover:text-ink aria-expanded:text-ink"
        >
          {label}
          <ChevronDown aria-hidden strokeWidth={1.5} className="size-4" />
        </button>
      </MenuTrigger>
      <MenuContent>
        {links.map((link) => (
          <MenuItem key={link.href} asChild>
            <UiLink href={link.href}>{link.label}</UiLink>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
