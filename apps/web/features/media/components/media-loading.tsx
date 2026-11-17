"use client";

import { Button, LoadingRegion, Skeleton } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Ladezustand in der Form der Bibliothek: Titel, Upload-Fläche, Raster. Nach 8 Sekunden mit Ausweg (PRD 13). */
export function MediaLoading({ shape }: { shape: "library" | "detail" }) {
  const t = useTranslations("media.state");
  const router = useRouter();
  return (
    <LoadingRegion
      label={t("loading")}
      slowFallback={
        <div className="flex flex-wrap items-center gap-3 text-small text-ink-muted">
          {t("slow")}
          <Button onClick={() => router.refresh()}>{t("retry")}</Button>
        </div>
      }
      className="gap-6"
    >
      <Skeleton variant="block" className="h-8 w-1/3 rounded-chip" />
      {shape === "library" ? (
        <>
          <Skeleton variant="block" className="h-40 rounded-card" />
          <div className="grid grid-cols-2 gap-3 xs:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((tile) => (
              <Skeleton key={tile} variant="block" className="aspect-[4/5] rounded-control" />
            ))}
          </div>
        </>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton variant="block" className="aspect-[4/5] rounded-control" />
          <Skeleton lines={6} />
        </div>
      )}
    </LoadingRegion>
  );
}
