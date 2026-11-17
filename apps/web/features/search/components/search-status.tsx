"use client";

import {
  Button,
  ErrorState,
  LoadingRegion,
  ProfileCardSkeleton,
  Skeleton,
} from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Lädt die Seite mit derselben URL neu; die Filter bleiben erhalten. */
export function ReloadButton({
  label,
  onReload,
}: {
  label: string;
  onReload?: () => void;
}) {
  const router = useRouter();
  return (
    <Button
      variant="primary"
      onClick={() => {
        onReload?.();
        router.refresh();
      }}
    >
      {label}
    </Button>
  );
}

/** Ladezustand in der Form der Suche: Überschrift, Filterleiste, Raster aus Karten (PRD 13). */
export function SearchLoading({ cards = 8 }: { cards?: number }) {
  const t = useTranslations("search.state");
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
      <Skeleton variant="block" className="h-9 w-2/3 max-w-md rounded-chip" />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-8">
        <div className="hidden flex-col gap-3 lg:flex">
          <Skeleton variant="block" className="h-7 w-1/2 rounded-chip" />
          <Skeleton lines={6} />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: cards }, (_, index) => (
            // Platzhalter ohne eigene Identität; die Position ist der Schlüssel.
            <ProfileCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

/** Fehlerzustand der Suchseiten: was passiert ist, was erhalten blieb, was jetzt geht (PRD 13). */
export function SearchError({ reset }: { reset: () => void }) {
  const t = useTranslations("search.state");
  return (
    <div className="flex max-w-prose flex-col">
      <h1 className="sr-only">{t("errorTitle")}</h1>
      <ErrorState
        title={t("errorTitle")}
        description={t("errorDescription")}
        action={<ReloadButton label={t("reload")} onReload={reset} />}
      />
    </div>
  );
}
