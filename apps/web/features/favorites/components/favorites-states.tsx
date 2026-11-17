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

type Area = "page" | "searches";

/** Ladezustand von `/favoriten` und `/suchen`: Titel, Zeile der Sammlungen, Einträge als Skelett. */
export function FavoritesLoading({ area }: { area: Area }) {
  const t = useTranslations(
    area === "page" ? "favorites.page" : "favorites.searches",
  );
  return (
    <LoadingRegion label={t("loading")} className="max-w-reading gap-6">
      <Skeleton variant="block" className="h-8 w-1/3 rounded-chip" />
      {area === "page" ? (
        <Skeleton variant="block" className="h-11 w-2/3 rounded-full" />
      ) : null}
      <div className="flex flex-col gap-4 border-t border-border pt-4">
        {[0, 1, 2].map((row) => (
          <SkeletonRow key={row} />
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Fehlerzustand: was passiert ist, dass nichts verloren ging, und der Weg zurück. */
export function FavoritesError({
  area,
  reset,
}: {
  area: Area;
  reset: () => void;
}) {
  const t = useTranslations(
    area === "page" ? "favorites.page" : "favorites.searches",
  );
  const router = useRouter();
  return (
    <div className="max-w-reading">
      <h1 className="sr-only">
        {area === "page" ? t("metaTitle") : t("title")}
      </h1>
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
