"use client";

import { IconButton, Menu, MenuContent, MenuItem, MenuTrigger } from "@app/ui";
import { Ellipsis, Flag, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

/** Zeilenmenü einer Nachricht: eigene löschen, fremde melden. */
export function MessageMenu({
  own,
  onDelete,
  onReport,
}: {
  own: boolean;
  onDelete: () => void;
  onReport: () => void;
}) {
  const t = useTranslations("messages.menu");
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton label={t("label")} icon={<Ellipsis strokeWidth={1.5} />} />
      </MenuTrigger>
      <MenuContent align={own ? "end" : "start"}>
        {own ? (
          <MenuItem
            destructive
            icon={<Trash2 strokeWidth={1.5} />}
            onSelect={onDelete}
          >
            {t("delete")}
          </MenuItem>
        ) : (
          <MenuItem icon={<Flag strokeWidth={1.5} />} onSelect={onReport}>
            {t("report")}
          </MenuItem>
        )}
      </MenuContent>
    </Menu>
  );
}
