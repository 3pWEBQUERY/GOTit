"use client";

import { Button, LoadingRegion, Skeleton } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Ladezustand der Profilseite in der Form des Inhalts: Foto, Name, Signale, Abschnitte (PRD 13). */
export function ProfileLoading() {
  const t = useTranslations("profile.state");
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
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-x-8">
        <Skeleton variant="block" className="aspect-4/5 w-full rounded-card md:aspect-video" />
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-9 w-2/3 rounded-chip" />
          <Skeleton className="w-1/2" />
          <Skeleton lines={2} />
        </div>
        <div className="flex flex-col gap-3 md:col-start-1">
          <Skeleton variant="block" className="h-7 w-1/3 rounded-chip" />
          <Skeleton lines={4} />
        </div>
      </div>
    </LoadingRegion>
  );
}
