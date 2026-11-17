"use client";

import {
  Button,
  IconButton,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
  ProfileCard,
} from "@app/ui";
import { ArrowDown, ArrowUp, Ellipsis, FolderPlus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { EntryItem } from "../queries/load-collection";

export interface EntryRowProps {
  entry: EntryItem;
  position: number;
  total: number;
  /** Die anderen eigenen Sammlungen, mit Häkchen, wo das Profil schon liegt. */
  others: readonly { id: string; name: string; member: boolean }[];
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
  onMembership: (collectionId: string, member: boolean) => void;
  onNewCollection: () => void;
}

/**
 * Ein Eintrag einer Sammlung: ProfileCard als Listenzeile mit Menü («Nach
 * oben», «Nach unten», Sammlungen, «Entfernen»). Nicht mehr verfügbare
 * Profile erscheinen als neutrale Zeile ohne Name, Bild und Link (Entscheid 0013).
 */
export function EntryRow({
  entry,
  position,
  total,
  others,
  onMove,
  onRemove,
  onMembership,
  onNewCollection,
}: EntryRowProps) {
  const t = useTranslations("favorites.entry");

  if (entry.state === "unavailable") {
    const hintId = `eintrag-${entry.id}-hinweis`;
    return (
      <li
        data-entry={entry.id}
        data-entry-state="unavailable"
        className="flex flex-col gap-3 py-4 xs:flex-row xs:items-start"
      >
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div
            aria-hidden
            className="aspect-4/5 w-24 shrink-0 rounded-card bg-surface-2"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-h3">{t("unavailable")}</h2>
            <p id={hintId} className="text-small text-ink-muted">
              {t("unavailableHint")}
            </p>
          </div>
        </div>
        <Button
          icon={<Trash2 aria-hidden strokeWidth={1.5} />}
          aria-describedby={hintId}
          onClick={onRemove}
          data-entry-menu={entry.id}
          className="self-start"
        >
          {t("remove")}
        </Button>
      </li>
    );
  }

  return (
    <li
      data-entry={entry.id}
      data-entry-state={entry.state}
      className="flex items-start gap-2 py-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <ProfileCard
          variant="list"
          href={entry.href}
          name={entry.name}
          headingLevel={2}
          region={entry.region ?? undefined}
          image={
            entry.image
              ? {
                  src: entry.image.src,
                  alt: entry.image.alt ?? t("coverAlt", { name: entry.name }),
                  ...(entry.image.color
                    ? { placeholderColor: entry.image.color }
                    : {}),
                }
              : undefined
          }
        />
        {entry.state === "paused" ? (
          <p className="pl-28 text-small text-ink-muted">{t("paused")}</p>
        ) : null}
      </div>
      <Menu>
        <MenuTrigger asChild>
          <IconButton
            label={t("actions", { name: entry.name })}
            icon={<Ellipsis strokeWidth={1.5} />}
            data-entry-menu={entry.id}
          />
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem
            icon={<ArrowUp aria-hidden strokeWidth={1.5} />}
            disabled={position === 1}
            onSelect={() => onMove("up")}
          >
            {t("moveUp")}
          </MenuItem>
          <MenuItem
            icon={<ArrowDown aria-hidden strokeWidth={1.5} />}
            disabled={position === total}
            onSelect={() => onMove("down")}
          >
            {t("moveDown")}
          </MenuItem>
          <MenuSeparator />
          {others.length > 0 ? (
            <MenuLabel>{t("inCollections")}</MenuLabel>
          ) : null}
          {others.map((collection) => (
            <MenuCheckboxItem
              key={collection.id}
              checked={collection.member}
              onCheckedChange={(checked) =>
                onMembership(collection.id, checked === true)
              }
            >
              {collection.name}
            </MenuCheckboxItem>
          ))}
          <MenuItem
            icon={<FolderPlus aria-hidden strokeWidth={1.5} />}
            onSelect={onNewCollection}
          >
            {t("newCollection")}
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            destructive
            icon={<Trash2 aria-hidden strokeWidth={1.5} />}
            onSelect={onRemove}
          >
            {t("remove")}
          </MenuItem>
        </MenuContent>
      </Menu>
    </li>
  );
}
