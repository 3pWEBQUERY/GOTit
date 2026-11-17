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

/** Ladezustand in der Form des Messengers: Titel, Ansichten, Liste und, mit `thread`, Verlauf. */
export function MessengerLoading({ thread }: { thread: boolean }) {
  const t = useTranslations("messages.state");
  const router = useRouter();
  return (
    <LoadingRegion
      label={t("loading")}
      className="gap-6"
      slowFallback={
        <div className="flex flex-col items-start gap-2">
          <p className="text-small text-ink-muted">{t("slow")}</p>
          <Button onClick={() => router.refresh()}>{t("retry")}</Button>
        </div>
      }
    >
      <Skeleton variant="block" className="h-8 w-1/3 rounded-chip" />
      <div className="grid gap-6 md:grid-cols-[17rem_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div
          className={
            thread ? "flex flex-col gap-3 max-md:hidden" : "flex flex-col gap-3"
          }
        >
          <Skeleton variant="block" className="h-11 w-full rounded-full" />
          <Skeleton variant="block" className="h-11 w-full rounded-control" />
          {[0, 1, 2, 3].map((row) => (
            <SkeletonRow key={row} />
          ))}
        </div>
        <div
          className={
            thread ? "flex flex-col gap-4" : "hidden flex-col gap-4 md:flex"
          }
        >
          {thread ? (
            <>
              <Skeleton variant="block" className="h-8 w-1/2 rounded-chip" />
              <Skeleton variant="block" className="h-12 w-2/3 rounded-card" />
              <Skeleton
                variant="block"
                className="ml-auto h-12 w-1/2 rounded-card"
              />
              <Skeleton variant="block" className="h-12 w-3/5 rounded-card" />
            </>
          ) : (
            <Skeleton variant="block" className="h-64 w-full rounded-card" />
          )}
        </div>
      </div>
    </LoadingRegion>
  );
}

/** Fehlerzustand: was passiert ist, dass nichts verloren ging, und der Weg zurück (PRD 13). */
export function MessengerError({ reset }: { reset: () => void }) {
  const t = useTranslations("messages.state");
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
