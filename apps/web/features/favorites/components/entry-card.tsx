"use client";

import {
  Button,
  Checkbox,
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
import {
  ArrowLeft,
  ArrowRight,
  Ellipsis,
  FolderInput,
  FolderPlus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useFavorite } from "./use-favorite";
import type { EntryItem } from "../queries/load-collection";

export interface EntryCardProps {
  entry: EntryItem;
  position: number;
  total: number;
  selected: boolean;
  /** Liegt das Profil in «Favoriten»? Bestimmt das Herz auf dem Foto. */
  favorite: boolean;
  /** Die anderen eigenen Sammlungen, mit Häkchen, wo das Profil schon liegt. */
  others: readonly { id: string; name: string; member: boolean }[];
  onSelect: (selected: boolean) => void;
  onMove: (direction: "up" | "down") => void;
  onMoveTo: () => void;
  onRemove: () => void;
  onMembership: (collectionId: string, member: boolean) => void;
  onNewCollection: () => void;
}

function SelectBox({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: (selected: boolean) => void;
}) {
  const t = useTranslations("favorites.entry");
  return (
    <Checkbox
      label={
        <>
          <span aria-hidden>{t("selectShort")}</span>
          <span className="sr-only">{label}</span>
        </>
      }
      checked={selected}
      onCheckedChange={(checked) => onSelect(checked === true)}
      className="min-w-0 [&_label]:text-small"
    />
  );
}

/**
 * Ein Eintrag im Raster (PRD v2 9.3, 12.1): ProfileCard mit dem Herz als
 * einzigem Element auf dem Foto, darunter Auswahl und Menü («Nach vorne»,
 * «Nach hinten», «In Sammlung verschieben …», Sammlungen, «Entfernen»).
 * Nicht mehr verfügbare Profile erscheinen als neutrale Fläche ohne Name,
 * Bild und Link (Entscheid 0013).
 */
export function EntryCard(props: EntryCardProps) {
  const { entry, selected, onSelect, onRemove } = props;
  const t = useTranslations("favorites.entry");

  if (entry.state === "unavailable") {
    const hintId = `eintrag-${entry.id}-hinweis`;
    return (
      <li
        data-entry={entry.id}
        data-entry-state="unavailable"
        className="flex min-w-0 flex-col gap-2"
      >
        <div className="flex aspect-4/5 flex-col items-center justify-center gap-2 rounded-card bg-surface-2 p-3 text-center">
          <h2 className="text-small font-[550] text-ink">{t("unavailable")}</h2>
          <p id={hintId} className="text-small text-ink-muted">
            {t("unavailableHint")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-1">
          <SelectBox
            label={t("selectUnavailable", { position: props.position })}
            selected={selected}
            onSelect={onSelect}
          />
          <Button
            icon={<Trash2 aria-hidden strokeWidth={1.5} />}
            aria-describedby={hintId}
            onClick={onRemove}
            data-entry-menu={entry.id}
          >
            {t("remove")}
          </Button>
        </div>
      </li>
    );
  }
  return <AvailableCard {...props} entry={entry} />;
}

function AvailableCard({
  entry,
  position,
  total,
  selected,
  favorite,
  others,
  onSelect,
  onMove,
  onMoveTo,
  onRemove,
  onMembership,
  onNewCollection,
}: EntryCardProps & { entry: Exclude<EntryItem, { state: "unavailable" }> }) {
  const t = useTranslations("favorites.entry");
  const heart = useFavorite({
    slug: entry.slug,
    initial: favorite,
    signInHref: null,
  });
  return (
    <li
      data-entry={entry.id}
      data-entry-state={entry.state}
      className="flex min-w-0 flex-col gap-2"
    >
      <ProfileCard
        variant="grid"
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
        favorite={{
          label: heart.pressed
            ? t("favoriteRemove", { name: entry.name })
            : t("favoriteAdd", { name: entry.name }),
          pressed: heart.pressed,
          onPressedChange: heart.toggle,
          disabled: heart.pending,
        }}
      />
      {entry.state === "paused" ? (
        <p className="text-small text-ink-muted">{t("paused")}</p>
      ) : null}
      <div className="flex items-center justify-between gap-1">
        <SelectBox
          label={t("select", { name: entry.name })}
          selected={selected}
          onSelect={onSelect}
        />
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
              icon={<ArrowLeft aria-hidden strokeWidth={1.5} />}
              disabled={position === 1}
              onSelect={() => onMove("up")}
            >
              {t("moveForward")}
            </MenuItem>
            <MenuItem
              icon={<ArrowRight aria-hidden strokeWidth={1.5} />}
              disabled={position === total}
              onSelect={() => onMove("down")}
            >
              {t("moveBackward")}
            </MenuItem>
            <MenuSeparator />
            {others.length > 0 ? (
              <MenuItem
                icon={<FolderInput aria-hidden strokeWidth={1.5} />}
                onSelect={onMoveTo}
              >
                {t("moveTo")}
              </MenuItem>
            ) : null}
            {others.length > 0 ? <MenuLabel>{t("alsoIn")}</MenuLabel> : null}
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
      </div>
    </li>
  );
}
