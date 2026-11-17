"use client";

import { Button } from "@app/ui";
import { Monitor, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { ProfileViewModel } from "../../model";
import { ProfileView } from "../view/profile-view";

/** Breite, in der die Desktop-Vorschau gesetzt und dann auf die Spalte verkleinert wird. */
const DESKTOP_WIDTH = 1100;

/**
 * Live-Vorschau mit Umschalter Mobile/Desktop (PRD v2 11.2). Sie rendert
 * dieselbe `ProfileView` wie `/p/[name]`, mit den ungespeicherten Werten.
 */
export function LivePreview({ model, now, idPrefix }: { model: ProfileViewModel; now: string; idPrefix: string }) {
  const t = useTranslations("profile.editor.preview");
  const [mode, setMode] = useState<"mobile" | "desktop">("mobile");
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(Math.min(1, entry.contentRect.width / DESKTOP_WIDTH));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={t("modeLabel")} className="flex flex-wrap gap-2">
        <Button variant={mode === "mobile" ? "primary" : "secondary"} aria-pressed={mode === "mobile"} icon={<Smartphone aria-hidden strokeWidth={1.5} />} onClick={() => setMode("mobile")}>
          {t("mobile")}
        </Button>
        <Button variant={mode === "desktop" ? "primary" : "secondary"} aria-pressed={mode === "desktop"} icon={<Monitor aria-hidden strokeWidth={1.5} />} onClick={() => setMode("desktop")}>
          {t("desktop")}
        </Button>
      </div>
      <div ref={frame} data-preview-frame={mode} className="overflow-hidden rounded-card border border-border bg-bg">
        {mode === "mobile" ? (
          <div className="mx-auto w-full max-w-sm p-4">
            <ProfileView model={model} now={now} layout="mobile" nameLevel={3} idPrefix={idPrefix} />
          </div>
        ) : (
          <div className="p-6" style={{ width: DESKTOP_WIDTH, zoom: scale }}>
            <ProfileView model={model} now={now} layout="desktop" nameLevel={3} idPrefix={idPrefix} />
          </div>
        )}
      </div>
    </div>
  );
}
