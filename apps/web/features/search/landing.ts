import { LOCALES, type Locale } from "@app/core/locale";
import { getLandingCategory, getLandingRegion } from "@app/core/search";
import { activeFilters, type RawParams } from "@app/core/search/query";
import type { Crumb } from "@app/ui";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { createHref, type HrefBuilder } from "../shell/nav/href";
import { presetQuery, type SearchPreset } from "./url";

export interface Landing {
  preset: SearchPreset;
  title: string;
  description: string;
  breadcrumbs: Crumb[];
  /** Pfad der Landingpage in jeder Sprache, für `alternates`. */
  pathFor: (href: HrefBuilder) => string;
}

/** `/ch/[kanton]` und `/ch/[kanton]/[stadt]`; `null` für unbekannte, nicht freigegebene oder falsch zugeordnete Regionen. */
export const loadRegionLanding = cache(
  async (
    locale: Locale,
    kanton: string,
    stadt?: string,
  ): Promise<Landing | null> => {
    const region = await getLandingRegion(
      stadt ?? kanton,
      locale,
      stadt ? kanton : undefined,
    );
    if (!region) return null;
    const t = await getTranslations({ locale, namespace: "search" });
    const href = createHref(locale);
    const cantonCrumb = (slug: string, name: string): Crumb => ({
      label: t("canton", { name }),
      href: href({ pathname: "/ch/[kanton]", params: { kanton: slug } }),
    });
    const pathFor = (build: HrefBuilder) =>
      region.canton
        ? build({
            pathname: "/ch/[kanton]/[stadt]",
            params: { kanton: region.canton.slug, stadt: region.slug },
          })
        : build({ pathname: "/ch/[kanton]", params: { kanton: region.slug } });
    const title =
      region.kind === "CANTON"
        ? t("landing.cantonTitle", { name: region.name })
        : t("landing.cityTitle", { name: region.name });
    return {
      preset: { path: pathFor(href), region: region.slug },
      title,
      description: t("meta.regionDescription", { region: region.name }),
      breadcrumbs: [
        { label: t("discover"), href: href("/") },
        ...(region.canton
          ? [
              cantonCrumb(region.canton.slug, region.canton.name),
              { label: region.name },
            ]
          : [{ label: t("canton", { name: region.name }) }]),
      ],
      pathFor,
    };
  },
);

/** `/kategorie/[slug]`; `null` für unbekannte oder nicht freigegebene Kategorien. */
export const loadCategoryLanding = cache(
  async (locale: Locale, slug: string): Promise<Landing | null> => {
    const category = await getLandingCategory(slug, locale);
    if (!category) return null;
    const t = await getTranslations({ locale, namespace: "search" });
    const href = createHref(locale);
    const pathFor = (build: HrefBuilder) =>
      build({ pathname: "/kategorie/[slug]", params: { slug: category.slug } });
    return {
      preset: { path: pathFor(href), category: category.slug },
      title: t("landing.categoryTitle", { name: category.name }),
      description: t("meta.categoryDescription", { category: category.name }),
      breadcrumbs: [
        { label: t("discover"), href: href("/") },
        { label: category.name },
      ],
      pathFor,
    };
  },
);

/** `/profile`: alle Einzelanbieter, heute alle Profile (Entscheid 0013). */
export async function profilesLanding(locale: Locale): Promise<Landing> {
  const t = await getTranslations({ locale, namespace: "search" });
  const href = createHref(locale);
  const pathFor = (build: HrefBuilder) => build("/profile");
  return {
    preset: { path: pathFor(href) },
    title: t("landing.profilesTitle"),
    description: t("meta.profilesDescription"),
    breadcrumbs: [
      { label: t("discover"), href: href("/") },
      { label: t("landing.profiles") },
    ],
    pathFor,
  };
}

function languages(
  pathFor: (href: HrefBuilder) => string,
): Record<string, string> {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, pathFor(createHref(locale))]),
  );
}

/** Metadaten einer Landingpage: indexierbar ohne zusätzliche Filter, Canonical immer auf den Pfad ohne Parameter. */
export function landingMetadata(
  landing: Landing | null,
  raw: RawParams,
  notFoundTitle: string,
): Metadata {
  if (!landing)
    return { title: notFoundTitle, robots: { index: false, follow: false } };
  const extra =
    activeFilters(presetQuery(raw, landing.preset)).length >
    (landing.preset.region || landing.preset.category ? 1 : 0);
  return {
    title: landing.title,
    description: landing.description,
    alternates: {
      canonical: landing.preset.path,
      languages: languages(landing.pathFor),
    },
    robots: extra ? { index: false, follow: true } : undefined,
  };
}

/** Metadaten von `/suche`: mit Filtern nicht indexiert. */
export async function searchMetadata(
  locale: Locale,
  raw: RawParams,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "search.meta" });
  const filtered = activeFilters(presetQuery(raw, null)).length > 0;
  return {
    title: t("searchTitle"),
    description: t("searchDescription"),
    alternates: {
      canonical: createHref(locale)("/suche"),
      languages: languages((build) => build("/suche")),
    },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}
