"use client";

import { cn } from "@app/ui";

export interface ThreadImage {
  id: string;
  src: string;
  width: number | null;
  height: number | null;
}

/**
 * Bilder einer Nachricht als Vorschau. Jedes ist ein Button, der die grosse
 * Ansicht öffnet; der Alternativtext nennt, von wem das Bild ist.
 */
export function MessageImages({
  images,
  alt,
  openLabel,
  onOpen,
}: {
  images: readonly ThreadImage[];
  alt: string;
  openLabel: string;
  onOpen: (index: number) => void;
}) {
  if (images.length === 0) return null;
  return (
    <ul
      className={cn(
        "grid gap-1",
        images.length > 1 ? "grid-cols-2" : "grid-cols-1",
      )}
    >
      {images.map((image, index) => (
        <li key={image.id} className="min-w-0">
          <button
            type="button"
            onClick={() => onOpen(index)}
            title={openLabel}
            className="block overflow-hidden rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Chat-Bilder kommen fertig vom Worker über eine kurzlebige URL; next/image würde sie zwischenspeichern */}
            <img
              src={image.src}
              alt={alt}
              width={image.width ?? undefined}
              height={image.height ?? undefined}
              loading="lazy"
              decoding="async"
              data-chat-image={image.id}
              className="block h-auto max-h-64 w-full max-w-56 bg-surface-2 object-cover"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
