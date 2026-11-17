import { listApprovedCategories } from "@app/core/catalog";
import type { Locale } from "@app/core/locale";
import { LANGUAGE_CODES } from "@app/core/onboarding/schemas";
import { listRegionLanding } from "@app/core/search";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { languageName } from "../../onboarding/format";
import { getShellData } from "../../shell/queries/get-shell-data";
import type { FilterLabelSource } from "../filter-labels";

export interface RegionOption {
  slug: string;
  name: string;
  /** Text in der Auswahl: Kantone als «Kanton Zürich», Städte mit ihrem Namen. */
  label: string;
  kind: "CANTON" | "CITY";
}

export interface FilterOptions {
  regions: RegionOption[];
  categories: { slug: string; name: string }[];
  languages: { code: string; name: string }[];
}

/** Alle freigegebenen Kategorien; der Kern liefert ohne Grenze höchstens so viele. */
const CATEGORY_LIMIT = 200;

/**
 * Auswahl der Filter (Entscheid 0013): freigegebene Kantone mit ihren Städten
 * und die hervorgehobenen Regionen, freigegebene Kategorien und die Sprachen,
 * die auch Onboarding und Editor anbieten.
 */
export const loadFilterOptions = cache(
  async (locale: Locale): Promise<FilterOptions> => {
    const [landing, { regions: featured }, categories, t] = await Promise.all([
      listRegionLanding(locale),
      getShellData(locale),
      listApprovedCategories(locale, CATEGORY_LIMIT),
      getTranslations({ locale, namespace: "search" }),
    ]);
    const regions: RegionOption[] = landing.flatMap((canton) => [
      {
        slug: canton.slug,
        name: canton.name,
        label: t("canton", { name: canton.name }),
        kind: "CANTON" as const,
      },
      ...canton.cities.map((city) => ({
        slug: city.slug,
        name: city.name,
        label: city.name,
        kind: "CITY" as const,
      })),
    ]);
    const known = new Set(regions.map((region) => region.slug));
    for (const region of featured)
      if (!known.has(region.slug))
        regions.push({
          slug: region.slug,
          name: region.name,
          label:
            region.kind === "CANTON"
              ? t("canton", { name: region.name })
              : region.name,
          kind: region.kind,
        });
    return {
      regions,
      categories,
      languages: LANGUAGE_CODES.map((code) => ({
        code,
        name: languageName(locale, code),
      })),
    };
  },
);

/** Texte der Chips und gespeicherten Suchen in der Sprache der Seite. */
export async function filterLabelSource(
  locale: Locale,
  options: FilterOptions,
): Promise<FilterLabelSource> {
  const t = await getTranslations({ locale, namespace: "search.chips" });
  const number = new Intl.NumberFormat(
    locale === "de" ? "de-CH" : `${locale}-CH`,
  );
  const regions = new Map(
    options.regions.map((region) => [region.slug, region.label]),
  );
  const categories = new Map(
    options.categories.map((category) => [category.slug, category.name]),
  );
  const list = new Intl.ListFormat(locale, { type: "disjunction" });
  return {
    regionName: (slug) => regions.get(slug) ?? null,
    categoryName: (slug) => categories.get(slug) ?? null,
    languageName: (code) => languageName(locale, code),
    list: (items) => list.format(items),
    t: {
      text: (text) => t("text", { text }),
      radius: (km) => t("radius", { km }),
      priceRange: (min, max) =>
        t("priceRange", { min: number.format(min), max: number.format(max) }),
      priceFrom: (min) => t("priceFrom", { min: number.format(min) }),
      priceTo: (max) => t("priceTo", { max: number.format(max) }),
      photos: t("photos"),
      newOnly: t("newOnly"),
      withReviews: t("withReviews"),
    },
  };
}
