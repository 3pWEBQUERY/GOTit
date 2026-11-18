"use client";

import {
  Button,
  ErrorState,
  LoadingRegion,
  ProfileCardSkeleton,
  Skeleton,
  SkeletonRow,
} from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export type ClubLoadingShape = "profile" | "grid" | "list";

/** Ladezustand in der Form des Inhalts, nach 8 Sekunden mit «Erneut versuchen» (v2 13). */
export function ClubLoading({ shape }: { shape: ClubLoadingShape }) {
  const t = useTranslations("clubs.state");
  const router = useRouter();
  return (
    <LoadingRegion
      label={t("loading")}
      // Mindestens bildschirmhoch: sonst springt die Fusszeile weg, sobald der Inhalt kommt (CLS, Messung 1.14).
      className="min-h-dvh gap-6"
      slowFallback={
        <div className="flex flex-wrap items-center gap-3 text-small text-ink-muted">
          {t("slow")}
          <Button onClick={() => router.refresh()}>{t("retry")}</Button>
        </div>
      }
    >
      {shape === "profile" ? (
        <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-x-8">
          <Skeleton
            variant="block"
            className="aspect-4/5 w-full rounded-card md:aspect-video"
          />
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
      ) : (
        <>
          <Skeleton variant="block" className="h-9 w-1/2 rounded-chip" />
          {shape === "grid" ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((index) => (
                <ProfileCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            [0, 1, 2].map((row) => <SkeletonRow key={row} />)
          )}
        </>
      )}
    </LoadingRegion>
  );
}

/** Fehlerzustand: was passiert ist, dass nichts verloren ging, und der nächste Schritt (v2 13). */
export function ClubError({ reset }: { reset: () => void }) {
  const t = useTranslations("clubs.state");
  const router = useRouter();
  return (
    <div className="flex max-w-prose flex-col">
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
