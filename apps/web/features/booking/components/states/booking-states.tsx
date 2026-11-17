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

/** Ladezustand von `/termine` und `/termine/[id]` in der Form des Inhalts (PRD 13). */
export function BookingLoading({ detail }: { detail: boolean }) {
  const t = useTranslations("booking.state");
  const router = useRouter();
  return (
    <LoadingRegion
      label={t("loading")}
      className="max-w-reading gap-6"
      slowFallback={
        <div className="flex flex-col items-start gap-2">
          <p className="text-small text-ink-muted">{t("slow")}</p>
          <Button onClick={() => router.refresh()}>{t("retry")}</Button>
        </div>
      }
    >
      <Skeleton variant="block" className="h-8 w-1/2 rounded-chip" />
      {detail ? (
        <>
          <Skeleton variant="block" className="h-6 w-32 rounded-full" />
          <Skeleton variant="block" className="h-24 w-full rounded-card" />
          <Skeleton variant="block" className="h-11 w-2/3 rounded-control" />
        </>
      ) : (
        <>
          <Skeleton variant="block" className="h-11 w-2/3 rounded-full" />
          {[0, 1, 2].map((row) => (
            <SkeletonRow key={row} />
          ))}
        </>
      )}
    </LoadingRegion>
  );
}

/** Fehlerzustand: was passiert ist, dass nichts verloren ging, und der Weg zurück (PRD 13). */
export function BookingError({ reset }: { reset: () => void }) {
  const t = useTranslations("booking.state");
  const router = useRouter();
  return (
    <div className="max-w-reading">
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
