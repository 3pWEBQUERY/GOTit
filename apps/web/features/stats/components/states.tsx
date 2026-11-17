"use client";

import { Button, ErrorState, LoadingRegion, Skeleton } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Ladezustand in der Form der Statistik: Zeitraum, vier Kennzahlen, zwei Grafiken (PRD 13). */
export function StatsLoading() {
  const t = useTranslations("stats.state");
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
      <Skeleton variant="block" className="h-8 w-1/3 rounded-chip" />
      <Skeleton
        variant="block"
        className="h-11 w-full max-w-md rounded-control"
      />
      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton
            key={item}
            variant="block"
            className="h-24 w-full rounded-control"
          />
        ))}
      </div>
      <Skeleton variant="block" className="h-72 w-full rounded-card" />
      <Skeleton variant="block" className="h-60 w-full rounded-card" />
    </LoadingRegion>
  );
}

/** Fehlerzustand: was passiert ist, dass nichts verloren ging, und der Weg zurück. */
export function StatsError({ reset }: { reset: () => void }) {
  const t = useTranslations("stats.state");
  const router = useRouter();
  return (
    <div className="flex max-w-reading flex-col">
      <h1 className="sr-only">{t("errorTitle")}</h1>
      <ErrorState
        title={t("errorTitle")}
        description={t("errorDescription")}
        action={
          <Button
            variant="primary"
            onClick={() => {
              reset();
              router.refresh();
            }}
          >
            {t("reload")}
          </Button>
        }
      />
    </div>
  );
}
