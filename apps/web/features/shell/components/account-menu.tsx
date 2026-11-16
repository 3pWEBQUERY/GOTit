"use client";

import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, UiLink } from "@app/ui";
import { LogOut } from "lucide-react";
import { useState } from "react";

export interface AccountMenuProps {
  /** Name des Kontos; die Initialen stehen im Auslöser. */
  name: string;
  label: string;
  links: readonly { label: string; href: string }[];
  signOut: { label: string; redirectTo: string };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase() || "?";
}

/** Avatar-Menü: Zugang zum Mitgliederbereich, der keine eigene Seitenleiste hat (PRD 12.1). */
export function AccountMenu({ name, label, links, signOut }: AccountMenuProps) {
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    await fetch("/api/auth/sign-out", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    window.location.assign(signOut.redirectTo);
  }

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex size-11 items-center justify-center rounded-full"
          data-account-menu
        >
          <span
            aria-hidden
            data-initials={initials(name)}
            className="inline-flex size-9 items-center justify-center rounded-full bg-surface-2 text-label text-ink before:content-[attr(data-initials)]"
          />
        </button>
      </MenuTrigger>
      <MenuContent align="end">
        <MenuLabel>{name}</MenuLabel>
        {links.map((link) => (
          <MenuItem key={link.href} asChild>
            <UiLink href={link.href}>{link.label}</UiLink>
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem icon={<LogOut strokeWidth={1.5} />} disabled={pending} onSelect={() => void onSignOut()}>
          {signOut.label}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
