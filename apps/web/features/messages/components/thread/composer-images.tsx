"use client";

import { IconButton } from "@app/ui";
import { CircleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComposerImage } from "./use-composer-images";

/** Angehängte Bilder über dem Feld: Fortschritt, Vorbereitung, Fehler mit Grund, Entfernen. */
export function ComposerImages({
  images,
  onRemove,
}: {
  images: readonly ComposerImage[];
  onRemove: (key: string) => void;
}) {
  const t = useTranslations("messages.images");
  if (images.length === 0) return null;
  return (
    <ul aria-label={t("listLabel")} className="flex flex-wrap gap-2 pb-2">
      {images.map((image, index) => {
        const state =
          image.state === "uploading"
            ? t("uploading", { percent: Math.round(image.progress) })
            : image.state === "processing"
              ? t("processing")
              : image.state === "ready"
                ? t("ready")
                : t(`failure.${image.failure ?? "network"}`);
        return (
          <li
            key={image.key}
            data-composer-image={image.state}
            className="flex w-36 min-w-0 items-start gap-1 rounded-control border border-border bg-surface p-1"
          >
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-2">
              {image.src && image.state !== "failed" ? (
                // eslint-disable-next-line @next/next/no-img-element -- lokale Vorschau (blob:) oder geschützte Route; next/image passt zu keinem von beiden
                <img
                  src={image.src}
                  alt={t("previewAlt", { number: index + 1 })}
                  className="size-full object-cover"
                />
              ) : (
                <CircleAlert
                  aria-hidden
                  strokeWidth={1.5}
                  className="size-5 text-error"
                />
              )}
            </span>
            <span
              className={
                image.state === "failed"
                  ? "min-w-0 flex-1 py-1 text-label text-error"
                  : "min-w-0 flex-1 py-1 text-label text-ink-muted"
              }
            >
              {state}
              {image.state === "uploading" ? (
                <progress
                  className="sr-only"
                  max={100}
                  value={Math.round(image.progress)}
                >
                  {Math.round(image.progress)}
                </progress>
              ) : null}
            </span>
            <IconButton
              label={t("remove", { number: index + 1 })}
              icon={<X strokeWidth={1.5} />}
              onClick={() => onRemove(image.key)}
              className="-m-1"
            />
          </li>
        );
      })}
    </ul>
  );
}
