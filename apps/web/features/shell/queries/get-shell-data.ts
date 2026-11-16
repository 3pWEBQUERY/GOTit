import { listApprovedCategories } from "@app/core/catalog";
import { isFeatureEnabled } from "@app/core/flags";
import { listFeaturedRegions } from "@app/core/geo";
import type { Locale } from "@app/core/locale";
import { cache } from "react";

/** Daten der Navigation: nur freigegebene Regionen und Kategorien (PRD 6.3). */
export const getShellData = cache(async (locale: Locale) => {
  const [regions, categories, communityEnabled] = await Promise.all([
    listFeaturedRegions(locale),
    listApprovedCategories(locale),
    isFeatureEnabled("community"),
  ]);
  return { regions, categories, communityEnabled };
});

export type ShellData = Awaited<ReturnType<typeof getShellData>>;
