import { mediaSrcSet, mediaUrl } from "@app/core/media/variants";
import { ImageIcon } from "lucide-react";
import type { CSSProperties } from "react";
import type { LibraryItem } from "../library/types";
import { WITH_VARIANTS } from "../library/types";

/** Grosse Vorschau mit AVIF und WebP; die Platzhalterfarbe füllt die Fläche, solange das Bild lädt. Kein Glas. */
export function MediaPreview({ item, alt, pendingLabel, src }: { item: LibraryItem; alt: string; pendingLabel: string; src?: (format: "avif" | "webp") => string }) {
  const ratio: CSSProperties = item.width && item.height ? { aspectRatio: `${item.width} / ${item.height}` } : { aspectRatio: "4 / 5" };
  const style: CSSProperties = item.dominantColor ? { ...ratio, backgroundColor: item.dominantColor } : ratio;
  if (!WITH_VARIANTS.includes(item.status)) {
    return (
      <div className="flex max-h-[70vh] w-full flex-col items-center justify-center gap-2 rounded-control bg-surface-2 p-6 text-center text-small text-ink-muted" style={ratio}>
        <ImageIcon aria-hidden strokeWidth={1.5} className="size-6" />
        {pendingLabel}
      </div>
    );
  }
  return (
    <div className="w-full overflow-hidden rounded-control bg-surface-2" style={style}>
      <picture>
        <source type="image/avif" srcSet={src ? src("avif") : mediaSrcSet(item.id, "avif")} sizes="(min-width: 768px) 50vw, 100vw" />
        <source type="image/webp" srcSet={src ? src("webp") : mediaSrcSet(item.id, "webp")} sizes="(min-width: 768px) 50vw, 100vw" />
        <img src={src ? src("webp") : mediaUrl(item.id, 960, "webp")} alt={alt} decoding="async" className="size-full object-contain" />
      </picture>
    </div>
  );
}
