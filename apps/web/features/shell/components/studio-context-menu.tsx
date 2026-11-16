"use client";

import { IconButton, Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger, UiLink } from "@app/ui";
import { ChevronsUpDown } from "lucide-react";

export interface StudioContext {
  key: string;
  label: string;
  href: string;
}

/** Wahl zwischen «Mein Profil» und den eigenen Organisationen (PRD 6.1, Punkt 7). */
export function StudioContextMenu({ label, contexts }: { label: string; contexts: readonly StudioContext[] }) {
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton label={label} icon={<ChevronsUpDown strokeWidth={1.5} />} />
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>{label}</MenuLabel>
        {contexts.map((context) => (
          <MenuItem key={context.key} asChild>
            <UiLink href={context.href}>{context.label}</UiLink>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
