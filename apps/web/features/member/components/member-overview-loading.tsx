"use client";

import { LoadingRegion, Skeleton, SkeletonRow } from "@app/ui";
import { useTranslations } from "next-intl";

/** Ladezustand der Übersicht: Titel und drei Listen als Skelett. */
export function MemberOverviewLoading() {
  const t = useTranslations("member.overview");
  return (
    <LoadingRegion label={t("loading")} className="max-w-reading gap-8">
      <Skeleton variant="block" className="h-8 w-1/3 rounded-chip" />
      {[0, 1, 2].map((list) => (
        <div key={list} className="flex flex-col gap-2 border-t border-border pt-6">
          <Skeleton className="w-1/3" />
          <SkeletonRow />
        </div>
      ))}
    </LoadingRegion>
  );
}
