"use client";

import { Button, LoadingRegion, Skeleton } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/**
 * Ladezustand in der Form einer Admin-Seite: Titel, dann Tabellenzeilen von
 * 40 px oder drei Spalten des Einzelfalls. Nach 8 Sekunden mit Ausweg (PRD 13).
 */
export function AdminLoading({ shape }: { shape: "table" | "case" }) {
  const t = useTranslations("admin.state");
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
      <Skeleton variant="block" className="h-8 w-1/3 rounded-chip" />
      {shape === "table" ? (
        <div className="flex flex-col">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex h-10 items-center border-b border-border">
              <Skeleton className="w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((column) => (
            <Skeleton key={column} lines={6} />
          ))}
        </div>
      )}
    </LoadingRegion>
  );
}
