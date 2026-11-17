"use client";

import {
  Button,
  ErrorState,
  LoadingRegion,
  Skeleton,
  SkeletonRow,
} from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export type StudioShape = "calendar" | "availability" | "list" | "detail";

/** Ladezustand in der Form der Seite, nach 8 Sekunden mit «Erneut versuchen» (PRD 13). */
export function BookingStudioLoading({ shape }: { shape: StudioShape }) {
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
      <Skeleton variant="block" className="h-8 w-1/3 rounded-chip" />
      {shape === "calendar" ? (
        <>
          <Skeleton variant="block" className="h-11 w-full rounded-control" />
          <Skeleton variant="block" className="h-96 w-full rounded-card" />
        </>
      ) : null}
      {shape === "availability" ? (
        <div className="flex max-w-reading flex-col gap-3">
          {[0, 1, 2, 3, 4, 5, 6].map((row) => (
            <Skeleton
              key={row}
              variant="block"
              className="h-14 w-full rounded-control"
            />
          ))}
        </div>
      ) : null}
      {shape === "list" ? (
        <div className="flex flex-col gap-3">
          <Skeleton variant="block" className="h-11 w-2/3 rounded-full" />
          {[0, 1, 2, 3].map((row) => (
            <SkeletonRow key={row} />
          ))}
        </div>
      ) : null}
      {shape === "detail" ? (
        <div className="flex max-w-reading flex-col gap-4">
          <Skeleton lines={4} />
          <Skeleton variant="block" className="h-11 w-2/3 rounded-control" />
          <Skeleton lines={3} />
        </div>
      ) : null}
    </LoadingRegion>
  );
}

/** Fehlerzustand: was passiert ist, dass nichts verloren ging, und der Weg zurück. */
export function BookingStudioError({ reset }: { reset: () => void }) {
  const t = useTranslations("bookingStudio.state");
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
