"use client";

import { Images } from "lucide-react";
import { useState, type UIEvent } from "react";
import { cn } from "../../cn";
import { Button } from "../actions/button";
import { MediaFrame, type MediaItem } from "./media-frame";

/** Ab 768 px zeigt die Galerie ein grosses Bild und vier Vorschauen. */
const DESKTOP_VISIBLE = 5;

export interface MediaGalleryProps {
  /** Zugänglicher Name der Galerie. */
  label: string;
  items: readonly MediaItem[];
  /** Öffnet das Medium an dieser Stelle, in der Regel in der `Lightbox`. */
  onOpen: (index: number) => void;
  /** Text des Buttons zu allen Medien, zum Beispiel «Alle 18 Medien ansehen». Ohne Angabe gibt es den Button nicht. */
  allLabel?: string;
  /** Ziel des Buttons zu allen Medien. Ohne Angabe öffnet er das erste Medium. */
  onOpenAll?: () => void;
  /** Zähler der mobilen Reihe, zum Beispiel «1 / 18». */
  counterLabel: (current: number, total: number) => string;
  /** Gesamtzahl der Medien, falls mehr existieren, als übergeben sind. */
  total?: number;
  className?: string;
}

/**
 * Medien der Profilseite (PRD 10). Unter 768 px eine wischbare Reihe mit
 * Zähler als Text unter dem Bild; ab 768 px ein grosses Bild im Verhältnis
 * 4 : 5 mit vier Vorschauen. Jedes Medium ist ein Button mit dem
 * Alternativtext als Namen. Kein Glas und kein Text auf den Bildern.
 */
export function MediaGallery({ label, items, onOpen, allLabel, onOpenAll, counterLabel, total, className }: MediaGalleryProps) {
  const [current, setCurrent] = useState(0);
  const count = total ?? items.length;
  const single = items.length === 1;

  function onScroll(event: UIEvent<HTMLUListElement>) {
    const { scrollLeft, clientWidth } = event.currentTarget;
    if (clientWidth === 0) return;
    const index = Math.min(items.length - 1, Math.max(0, Math.round(scrollLeft / clientWidth)));
    setCurrent(index);
  }

  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ul
        aria-label={label}
        onScroll={onScroll}
        className={cn(
          "flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] md:grid md:overflow-visible",
          single ? "md:max-w-panel md:grid-cols-1" : "md:grid-cols-4",
        )}
      >
        {items.map((item, index) => (
          <li
            key={item.key}
            className={cn(
              "aspect-4/5 w-full shrink-0 snap-center md:w-auto",
              index === 0 && !single && "md:col-span-2 md:row-span-2",
              index >= DESKTOP_VISIBLE && "md:hidden",
            )}
          >
            <button type="button" onClick={() => onOpen(index)} className="block size-full overflow-hidden rounded-card text-ink">
              <MediaFrame item={item} eager={index === 0} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="tabular text-small text-ink-muted md:hidden">{counterLabel(current + 1, count)}</p>
        {allLabel ? (
          <Button variant="secondary" icon={<Images aria-hidden strokeWidth={1.5} />} onClick={() => (onOpenAll ? onOpenAll() : onOpen(0))}>
            {allLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
