"use client";

import { Checkbox, IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, UiLink, cn } from "@app/ui";
import { ArrowLeft, ArrowRight, Ellipsis, Image as ImageIcon, PencilLine, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties, DragEvent } from "react";
import type { LibraryItem } from "./types";
import { MediaStatusLabel, MediaVisibilityLabel } from "./media-status";

export interface MediaTileProps {
  item: LibraryItem;
  position: number;
  total: number;
  selected: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onSelect: (selected: boolean) => void;
  onMove: (direction: "forward" | "backward") => void;
  onCover: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (event: DragEvent<HTMLLIElement>) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

/**
 * Ein Medium im Raster: Vorschau, Status als Wort, Sichtbarkeit, Auswahl und
 * Menü. Ziehen ordnet mit der Maus; «Nach vorne» und «Nach hinten» im Menü tun
 * dasselbe mit der Tastatur (PRD v2 11.3). Kein Glas auf Medien.
 */
export function MediaTile({ item, position, total, selected, dragging, dropTarget, onSelect, onMove, onCover, onDelete, onDragStart, onDragOver, onDrop, onDragEnd }: MediaTileProps) {
  const t = useTranslations("media.library");
  const tFailure = useTranslations("media.failure");
  const alt = item.altText ?? t("neutralAlt", { position });
  // Einzige Inline-Farbe: die dominante Farbe des Bilds als Platzhalter, ein Datenwert.
  const placeholder: CSSProperties | undefined = item.dominantColor ? { backgroundColor: item.dominantColor } : undefined;
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Ziehen ist der Weg für die Maus; per Tastatur ordnen «Nach vorne» und «Nach hinten» im Menü
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
        onDragStart();
      }}
      onDragOver={onDragOver}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
      data-media-id={item.id}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-control border bg-surface p-2 transition-colors duration-state",
        selected ? "border-ink" : "border-border",
        dropTarget && "border-dashed border-ink bg-surface-2",
        dragging && "opacity-55",
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-chip bg-surface-2" style={placeholder}>
        {item.thumbSrc && item.detailHref ? (
          <UiLink href={item.detailHref} draggable={false} className="block size-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- Varianten kommen fertig aus /media; next/image würde sie ein zweites Mal kodieren */}
            <img src={item.thumbSrc} alt={alt} loading="lazy" decoding="async" draggable={false} className="size-full object-cover" />
          </UiLink>
        ) : item.thumbSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- Varianten kommen fertig aus /media; next/image würde sie ein zweites Mal kodieren */}
            <img src={item.thumbSrc} alt={alt} loading="lazy" decoding="async" draggable={false} className="size-full object-cover" />
          </>
        ) : (
          <span role="img" aria-label={alt} className="flex size-full items-center justify-center text-ink-muted">
            <ImageIcon aria-hidden strokeWidth={1.5} className="size-6" />
          </span>
        )}
        {item.isCover ? (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-chip bg-surface px-2 py-1 text-small text-ink">
            <Star aria-hidden strokeWidth={1.5} className="size-4" />
            {t("cover")}
          </span>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-1">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="tabular text-small text-ink-muted">{t("position", { position })}</span>
          <MediaStatusLabel status={item.status} />
          <MediaVisibilityLabel visibility={item.visibility} />
          {item.status === "FAILED" && item.failureReason ? (
            <span className="text-small break-words text-error">{tFailure.has(item.failureReason) ? tFailure(item.failureReason) : tFailure("unreadable")}</span>
          ) : null}
          {item.status === "PROCESSING" ? <span className="text-small text-ink-muted">{t("processingHint")}</span> : null}
        </div>
        <Menu>
          <MenuTrigger asChild>
            <IconButton label={t("actions", { position })} icon={<Ellipsis strokeWidth={1.5} />} data-media-menu={item.id} />
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem icon={<ArrowLeft aria-hidden strokeWidth={1.5} />} disabled={position === 1} onSelect={() => onMove("forward")}>
              {t("moveForward")}
            </MenuItem>
            <MenuItem icon={<ArrowRight aria-hidden strokeWidth={1.5} />} disabled={position === total} onSelect={() => onMove("backward")}>
              {t("moveBackward")}
            </MenuItem>
            {!item.isCover && item.status !== "FAILED" && item.status !== "PROCESSING" ? (
              <MenuItem icon={<Star aria-hidden strokeWidth={1.5} />} onSelect={onCover}>
                {t("makeCover")}
              </MenuItem>
            ) : null}
            {item.detailHref ? (
              <MenuItem asChild>
                <UiLink href={item.detailHref}>
                  <PencilLine aria-hidden strokeWidth={1.5} />
                  <span className="min-w-0 flex-1">{t("edit")}</span>
                </UiLink>
              </MenuItem>
            ) : null}
            <MenuSeparator />
            <MenuItem destructive icon={<Trash2 aria-hidden strokeWidth={1.5} />} onSelect={onDelete}>
              {t("delete")}
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <Checkbox label={t("select", { position })} checked={selected} onCheckedChange={(checked) => onSelect(checked === true)} className="[&_label]:text-small" />
    </li>
  );
}
