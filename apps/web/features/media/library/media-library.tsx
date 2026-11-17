"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { UploadPanel } from "../upload/upload-panel";
import { MediaGrid } from "./media-grid";
import type { LibraryData } from "./types";

const POLL_MS = 2500;

/**
 * Medienbibliothek (PRD v2 11.3): Upload oben, darunter das Raster. Solange
 * Medien verarbeitet werden, lädt sie den Stand regelmässig neu, damit der
 * Status ohne Neuladen von «Wird verarbeitet» zu «In Prüfung» wechselt.
 */
export function MediaLibrary({ data }: { data: LibraryData }) {
  const t = useTranslations("media.library");
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  const processing = data.items.some((item) => item.status === "PROCESSING");

  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(timer);
  }, [processing, refresh]);

  return (
    <div className="flex min-w-0 flex-col gap-8">
      {data.canEdit ? (
        <UploadPanel
          free={data.quota.max - data.quota.used}
          max={data.quota.max}
          hasUploadedBefore={data.hasUploadedBefore}
          canUpload={data.canUpload}
          onFinished={refresh}
          org={data.scope.kind === "organization" ? data.scope.org : undefined}
        />
      ) : null}
      <section aria-labelledby="medien-raster-titel" className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="medien-raster-titel" className="text-h3">
            {t("gridTitle")}
          </h2>
          <p className="tabular text-small text-ink-muted" data-media-quota>
            {t("quota", { used: data.quota.used, max: data.quota.max })}
          </p>
        </div>
        <MediaGrid items={data.items} scope={data.scope} readOnly={!data.canEdit} />
      </section>
    </div>
  );
}
