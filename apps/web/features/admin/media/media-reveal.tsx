"use client";

import { Button } from "@app/ui";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type CSSProperties } from "react";

/**
 * Vorschau mit Schutz vor versehentlicher Anzeige (PRD v2 12.4): zuerst
 * verdeckt, erst «Medium anzeigen» lädt das Bild über die geprüfte Route.
 */
export function MediaReveal({ src, alt, ratio, placeholderColor }: { src: string; alt: string; ratio: string; placeholderColor: string | null }) {
  const t = useTranslations("admin.media.preview");
  const [shown, setShown] = useState(false);
  const frame: CSSProperties = { aspectRatio: ratio };
  // Die Farbe ist ein Datenwert des Bilds (Platzhalter), kein Gestaltungswert.
  const style: CSSProperties = shown && placeholderColor ? { ...frame, backgroundColor: placeholderColor } : frame;
  return (
    <section aria-labelledby="medium-vorschau" className="flex min-w-0 flex-col gap-3">
      <h2 id="medium-vorschau" className="text-h3">
        {t("title")}
      </h2>
      <div className="flex max-h-[70vh] w-full items-center justify-center overflow-hidden rounded-control bg-surface-2" style={style} data-media-preview={shown ? "shown" : "hidden"}>
        {shown ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- Varianten kommen fertig aus /media; next/image würde sie ein zweites Mal kodieren */}
            <img src={src} alt={alt} className="size-full object-contain" />
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <EyeOff aria-hidden strokeWidth={1.5} className="size-6 text-ink-muted" />
            <p className="max-w-prose text-small text-ink-muted">{t("hidden")}</p>
            <Button variant="primary" icon={<Eye aria-hidden strokeWidth={1.5} />} onClick={() => setShown(true)}>
              {t("show")}
            </Button>
          </div>
        )}
      </div>
      {shown ? (
        <Button variant="secondary" icon={<EyeOff aria-hidden strokeWidth={1.5} />} className="self-start" onClick={() => setShown(false)}>
          {t("hide")}
        </Button>
      ) : null}
    </section>
  );
}
