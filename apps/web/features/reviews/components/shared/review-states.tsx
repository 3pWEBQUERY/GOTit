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

/** Ladezustand der Bewertungsseiten in der Form des Inhalts, nach 8 Sekunden mit «Erneut versuchen» (PRD 13). */
export function ReviewsLoading({ shape }: { shape: "list" | "form" }) {
  const t = useTranslations("reviews.state");
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
      {shape === "list" ? (
        [0, 1, 2].map((row) => <SkeletonRow key={row} />)
      ) : (
        <>
          {[0, 1, 2, 3].map((row) => (
            <Skeleton
              key={row}
              variant="block"
              className="h-16 w-full rounded-control"
            />
          ))}
          <Skeleton variant="block" className="h-32 w-full rounded-control" />
        </>
      )}
    </LoadingRegion>
  );
}

/** Fehlerzustand: was passiert ist, dass nichts verloren ging, und der Weg zurück (PRD 13). */
export function ReviewsError({ reset }: { reset: () => void }) {
  const t = useTranslations("reviews.state");
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
