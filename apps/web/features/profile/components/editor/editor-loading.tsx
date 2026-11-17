"use client";

import { Button, LoadingRegion, Skeleton } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Ladezustand von «Mein Profil»: Titel, Abschnittsliste und Vorschau als Skelett (PRD 13). */
export function EditorLoading() {
  const t = useTranslations("profile.state");
  const router = useRouter();
  return (
    <LoadingRegion
      label={t("editorLoading")}
      slowFallback={
        <div className="flex flex-wrap items-center gap-3 text-small text-ink-muted">
          {t("slow")}
          <Button onClick={() => router.refresh()}>{t("retry")}</Button>
        </div>
      }
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Skeleton variant="block" className="h-9 w-1/2 rounded-chip" />
          <Skeleton className="w-1/3" />
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} variant="block" className="h-12 rounded-control" />
          ))}
        </div>
        <Skeleton variant="block" className="hidden aspect-4/5 w-full rounded-card lg:block" />
      </div>
    </LoadingRegion>
  );
}
