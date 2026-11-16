"use client";

import { Button, LoadingRegion, Skeleton } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Ladezustand eines Abschnitts: Titel und Felder als Skelett, nach 8 Sekunden mit Ausweg (PRD 13). */
export function SettingsLoading() {
  const t = useTranslations("settings.state");
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
      className="gap-8"
    >
      <div className="flex flex-col gap-3">
        <Skeleton variant="block" className="h-8 w-1/3 rounded-chip" />
        <Skeleton lines={2} />
      </div>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-2">
          <Skeleton className="w-1/4" />
          <Skeleton variant="block" className="h-11 rounded-control" />
        </div>
      ))}
    </LoadingRegion>
  );
}
