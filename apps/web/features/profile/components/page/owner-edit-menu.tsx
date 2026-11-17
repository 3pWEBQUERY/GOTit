"use client";

import { PROFILE_SECTIONS, type ProfileSection } from "@app/core/provider-profile/schemas";
import { Button, Menu, MenuContent, MenuItem, MenuTrigger, UiLink } from "@app/ui";
import { ChevronDown, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** «Bearbeiten» der Eigentümer-Leiste: wählt den Abschnitt, der als Seitenpanel über dem Profil aufgeht. */
export function OwnerEditMenu({ links }: { links: Record<ProfileSection, string> }) {
  const t = useTranslations("profile.owner");
  const tSection = useTranslations("profile.editor.section");
  const router = useRouter();
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="primary" icon={<Pencil aria-hidden strokeWidth={1.5} />}>
          <span className="inline-flex items-center gap-1">
            {t("edit")}
            <ChevronDown aria-hidden strokeWidth={1.5} className="size-4" />
          </span>
        </Button>
      </MenuTrigger>
      <MenuContent align="end">
        {PROFILE_SECTIONS.map((section) => (
          <MenuItem
            key={section}
            asChild
            onSelect={(event) => {
              event.preventDefault();
              router.push(links[section], { scroll: false });
            }}
          >
            <UiLink href={links[section]}>{tSection(section)}</UiLink>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
