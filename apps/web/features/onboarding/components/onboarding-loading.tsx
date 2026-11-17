"use client";

import { Button, LoadingRegion, Skeleton } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Ladezustand eines Schritts: Fortschritt, Titel und Felder als Skelett, nach 8 Sekunden mit Ausweg (PRD 13). */
export function OnboardingLoading() {
  const t = useTranslations("onboarding.state");
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
      className="max-w-reading gap-6"
    >
      <div className="flex gap-1">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} variant="block" className="h-1 flex-1 rounded-full" />
        ))}
      </div>
      <Skeleton variant="block" className="h-8 w-1/2 rounded-chip" />
      <Skeleton lines={2} />
      {[0, 1].map((row) => (
        <div key={row} className="flex flex-col gap-2">
          <Skeleton className="w-1/4" />
          <Skeleton variant="block" className="h-11 rounded-control" />
        </div>
      ))}
    </LoadingRegion>
  );
}
