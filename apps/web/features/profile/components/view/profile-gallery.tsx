"use client";

import { Lightbox, MediaFrame, MediaGallery, cn, type MediaItem } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { recordMediaViewAction } from "../../../stats/actions/record-media-view";
import { initialsOf, type ViewMedia } from "../../model";
import type { ProfileLayout } from "./layout-classes";

const PLACEHOLDER: Record<ProfileLayout, string> = {
  responsive: "aspect-4/5 w-full md:aspect-video",
  mobile: "aspect-4/5 w-full",
  desktop: "aspect-video w-full",
};

/** Ab so vielen Medien führt ein Button zum Tab «Medien». */
const GALLERY_VISIBLE = 5;

export interface ProfileGalleryProps {
  name: string;
  media: readonly ViewMedia[];
  layout: ProfileLayout;
  /** Tab «Medien»; ohne Angabe (Vorschau) gibt es den Button zu allen Medien nicht. */
  mediaHref?: string;
  /** `grid`: alle Medien als Raster (Tab «Medien»). */
  variant?: "gallery" | "grid";
  /** Slug des Profils, wenn Öffnen in der Lightbox als Medienaufruf zählt (nur Besucher, nie Vorschau oder Inhaber). */
  countViewsFor?: string;
}

export function useMediaItems(name: string, media: readonly ViewMedia[]): MediaItem[] {
  const t = useTranslations("profile.media");
  return media.map((entry, index) => ({
    key: entry.key,
    alt: entry.alt ?? t("neutralAlt", { name, index: index + 1 }),
    src: entry.src ?? undefined,
    placeholderColor: entry.placeholderColor ?? undefined,
    initials: initialsOf(name),
    locked: entry.locked ? { reason: t("membersOnly") } : undefined,
  }));
}

/**
 * Medien mit Lightbox (PRD v2 10.1): Pfeile wechseln, Escape schliesst. Ohne
 * freigegebene Medien eine neutrale Fläche mit Initialen (PRD v2 4.3).
 */
export function ProfileGallery({ name, media, layout, mediaHref, variant = "gallery", countViewsFor }: ProfileGalleryProps) {
  const t = useTranslations("profile.media");
  const router = useRouter();
  const items = useMediaItems(name, media);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const counted = useRef(new Set<string>());
  const shown = open ? media[index] : undefined;
  // Ein Aufruf pro Medium und Seitenbesuch; der Kern zählt ohnehin höchstens einmal pro Tag.
  useEffect(() => {
    if (!countViewsFor || !shown || shown.locked || counted.current.has(shown.key)) return;
    counted.current.add(shown.key);
    void recordMediaViewAction(countViewsFor, shown.key).catch(() => undefined);
  }, [countViewsFor, shown]);
  const show = (next: number) => {
    setIndex(next);
    setOpen(true);
  };

  if (items.length === 0) {
    return (
      <div data-media-placeholder className={cn("overflow-hidden rounded-card", PLACEHOLDER[layout])}>
        <MediaFrame item={{ key: "platzhalter", alt: t("placeholderAlt", { name }), initials: initialsOf(name) }} />
      </div>
    );
  }

  const counter = (current: number, total: number) => t("counter", { current, total });
  return (
    <>
      {variant === "grid" ? (
        <ul aria-label={t("label", { name })} className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {items.map((item, position) => (
            <li key={item.key} className="aspect-4/5">
              <button type="button" onClick={() => show(position)} className="block size-full overflow-hidden rounded-card text-ink">
                <MediaFrame item={item} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <MediaGallery
          label={t("label", { name })}
          items={items}
          onOpen={show}
          counterLabel={counter}
          allLabel={mediaHref && items.length > GALLERY_VISIBLE ? t("all", { count: items.length }) : undefined}
          onOpenAll={mediaHref ? () => router.push(mediaHref) : undefined}
        />
      )}
      <Lightbox
        open={open}
        onOpenChange={setOpen}
        items={items}
        index={index}
        onIndexChange={setIndex}
        labels={{ title: t("lightboxTitle", { name }), close: t("close"), previous: t("previous"), next: t("next") }}
        counterLabel={counter}
      />
    </>
  );
}
