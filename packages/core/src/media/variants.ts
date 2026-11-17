/**
 * Feste Bildvarianten (PRD v2 14.3): AVIF und WebP in vier Breiten. Der Name
 * einer Variante ist zugleich ihr Teil in der URL `/media/[id]/[variante]`.
 */
export const MEDIA_WIDTHS = [320, 640, 960, 1440] as const;
export const MEDIA_FORMATS = ["avif", "webp"] as const;
export type MediaWidth = (typeof MEDIA_WIDTHS)[number];
export type MediaFormat = (typeof MEDIA_FORMATS)[number];

export function variantName(width: MediaWidth, format: MediaFormat): string {
  return `w${width}.${format}`;
}

export function parseVariantName(name: string): { width: MediaWidth; format: MediaFormat } | null {
  const match = /^w(\d+)\.(avif|webp)$/.exec(name);
  if (!match) return null;
  const width = Number(match[1]) as MediaWidth;
  const format = match[2] as MediaFormat;
  return (MEDIA_WIDTHS as readonly number[]).includes(width) ? { width, format } : null;
}

/** Öffentliche Adresse einer Variante; ausgeliefert über die Route in apps/web. */
export function mediaUrl(mediaId: string, width: MediaWidth, format: MediaFormat): string {
  return `/media/${mediaId}/${variantName(width, format)}`;
}

/** `srcset` für ein `<source type="image/…">` mit allen Breiten. */
export function mediaSrcSet(mediaId: string, format: MediaFormat): string {
  return MEDIA_WIDTHS.map((width) => `${mediaUrl(mediaId, width, format)} ${width}w`).join(", ");
}
