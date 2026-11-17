import type { Locale } from "@app/core/locale";
import { listRegionLanding } from "@app/core/search";
import { cookies } from "next/headers";
import { cache } from "react";
import { getShellData } from "../../shell/queries/get-shell-data";
import { REGION_COOKIE } from "../region-cookie";

export interface DiscoverRegion {
  slug: string;
  name: string;
  kind: "CANTON" | "CITY";
  cantonSlug: string | null;
}

/** Alle freigegebenen Regionen, die Entdecken zeigen kann: hervorgehobene zuerst, dann Kantone und Städte. */
export const listDiscoverRegions = cache(
  async (locale: Locale): Promise<DiscoverRegion[]> => {
    const [{ regions: featured }, cantons] = await Promise.all([
      getShellData(locale),
      listRegionLanding(locale),
    ]);
    const all: DiscoverRegion[] = featured.map((region) => ({
      slug: region.slug,
      name: region.name,
      kind: region.kind,
      cantonSlug: region.cantonSlug,
    }));
    const known = new Set(all.map((region) => region.slug));
    for (const canton of cantons) {
      if (!known.has(canton.slug))
        all.push({
          slug: canton.slug,
          name: canton.name,
          kind: "CANTON",
          cantonSlug: null,
        });
      for (const city of canton.cities)
        if (!known.has(city.slug))
          all.push({
            slug: city.slug,
            name: city.name,
            kind: "CITY",
            cantonSlug: canton.slug,
          });
      known.add(canton.slug);
      canton.cities.forEach((city) => known.add(city.slug));
    }
    return all;
  },
);

/** Region von Entdecken: die letzte Wahl aus dem Cookie, sofern noch freigegeben, sonst die erste hervorgehobene. */
export async function currentRegion(
  locale: Locale,
): Promise<{ region: DiscoverRegion | null; featured: DiscoverRegion[] }> {
  const [regions, { regions: featured }, jar] = await Promise.all([
    listDiscoverRegions(locale),
    getShellData(locale),
    cookies(),
  ]);
  const chosen = jar.get(REGION_COOKIE)?.value;
  const featuredRegions = regions.filter((region) =>
    featured.some((entry) => entry.slug === region.slug),
  );
  return {
    region:
      regions.find((region) => region.slug === chosen) ??
      featuredRegions[0] ??
      null,
    featured: featuredRegions,
  };
}
