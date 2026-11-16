import { LoadingRegion, Skeleton } from "@app/ui";
import { getTranslations } from "next-intl/server";

/** Ladezustand der Konto-Seiten: Skelett in der Form von Titel und Formular (PRD 13). */
export default async function AuthLoading() {
  const t = await getTranslations("auth.form");
  return (
    <div className="mx-auto w-full max-w-panel">
      <LoadingRegion label={t("loading")}>
        <Skeleton className="h-10 w-2/3" variant="block" />
        <Skeleton lines={2} />
        <Skeleton variant="block" className="h-11 rounded-control" />
        <Skeleton variant="block" className="h-11 rounded-control" />
        <Skeleton variant="block" className="h-11 w-1/2 rounded-control" />
      </LoadingRegion>
    </div>
  );
}
