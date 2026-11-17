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

/** Ladezustand der Organisationsseiten in der Form des Inhalts, nach 8 Sekunden mit «Erneut versuchen» (PRD 13). */
export function OrganizationLoading({
  shape,
}: {
  shape: "list" | "form" | "grid";
}) {
  const t = useTranslations("organization.state");
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
      {shape === "list"
        ? [0, 1, 2].map((row) => <SkeletonRow key={row} />)
        : null}
      {shape === "form"
        ? [0, 1, 2, 3].map((row) => (
            <Skeleton
              key={row}
              variant="block"
              className="h-16 w-full rounded-control"
            />
          ))
        : null}
      {shape === "grid" ? (
        <div className="grid grid-cols-2 gap-3 xs:grid-cols-3">
          {[0, 1, 2].map((tile) => (
            <Skeleton
              key={tile}
              variant="block"
              className="aspect-[4/5] w-full rounded-control"
            />
          ))}
        </div>
      ) : null}
    </LoadingRegion>
  );
}

/** Fehlerzustand: was passiert ist, dass nichts verloren ging, und der Weg zurück (PRD 13). */
export function OrganizationError({ reset }: { reset: () => void }) {
  const t = useTranslations("organization.state");
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
