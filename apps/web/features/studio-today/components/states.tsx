"use client";

import { LoadingRegion, Skeleton, SkeletonRow, Button } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { BookingStudioError } from "../../booking/studio/states/studio-states";

/** Ladezustand in der Form von «Heute»: zwei Spalten, Kennzahlen, Linie (PRD 13). */
export function TodayLoading() {
  const t = useTranslations("bookingStudio.state");
  const router = useRouter();
  return (
    <LoadingRegion
      label={t("loading")}
      className="gap-6"
      slowFallback={
        <div className="flex flex-wrap items-center gap-3 text-small text-ink-muted">
          {t("slow")}
          <Button onClick={() => router.refresh()}>{t("retry")}</Button>
        </div>
      }
    >
      <Skeleton variant="block" className="h-8 w-1/2 rounded-chip" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-3 rounded-card border border-border p-4">
          {[0, 1, 2].map((row) => (
            <SkeletonRow key={row} />
          ))}
        </div>
        <Skeleton variant="block" className="h-48 w-full rounded-card" />
      </div>
      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton
            key={item}
            variant="block"
            className="h-24 w-full rounded-control"
          />
        ))}
      </div>
      <Skeleton variant="block" className="h-44 w-full rounded-card" />
    </LoadingRegion>
  );
}

/** Fehlerzustand von «Heute»: derselbe Wortlaut wie die übrigen Studio-Seiten. */
export const TodayError = BookingStudioError;
