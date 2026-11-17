import { getDb } from "@app/db";
import { pickLocalizedName, type Locale } from "../locale";

/** Eine freigegebene Region für Landingpages und Breadcrumbs (PRD v2 7.1). */
export interface LandingRegion {
  slug: string;
  kind: "CANTON" | "CITY";
  name: string;
  canton: { slug: string; name: string } | null;
}

export interface RegionLanding {
  slug: string;
  name: string;
  cities: { slug: string; name: string }[];
}

const names = {
  nameDe: true,
  nameFr: true,
  nameIt: true,
  nameEn: true,
} as const;

/** Region per Slug; nur freigegeben. Eine Stadt verlangt den passenden, freigegebenen Kanton. */
export async function getLandingRegion(
  slug: string,
  locale: Locale,
  cantonSlug?: string,
): Promise<LandingRegion | null> {
  const region = await getDb().region.findFirst({
    where: { slug, approved: true },
    select: {
      slug: true,
      kind: true,
      ...names,
      parent: { select: { slug: true, approved: true, ...names } },
    },
  });
  if (!region) return null;
  if (cantonSlug !== undefined) {
    if (
      region.kind !== "CITY" ||
      region.parent?.slug !== cantonSlug ||
      !region.parent.approved
    )
      return null;
  } else if (region.kind !== "CANTON") {
    return null;
  }
  return {
    slug: region.slug,
    kind: region.kind,
    name: pickLocalizedName(region, locale),
    canton: region.parent
      ? {
          slug: region.parent.slug,
          name: pickLocalizedName(region.parent, locale),
        }
      : null,
  };
}

/** Alle freigegebenen Kantone mit ihren freigegebenen Städten, alphabetisch (Übersicht `/ch`). */
export async function listRegionLanding(
  locale: Locale,
): Promise<RegionLanding[]> {
  const cantons = await getDb().region.findMany({
    where: { approved: true, kind: "CANTON" },
    select: {
      slug: true,
      ...names,
      children: { where: { approved: true }, select: { slug: true, ...names } },
    },
  });
  const collator = new Intl.Collator(locale);
  return cantons
    .map((canton) => ({
      slug: canton.slug,
      name: pickLocalizedName(canton, locale),
      cities: canton.children
        .map((city) => ({
          slug: city.slug,
          name: pickLocalizedName(city, locale),
        }))
        .sort((a, b) => collator.compare(a.name, b.name)),
    }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

/** Freigegebene Kategorie per Slug (Landingpage `/kategorie/[slug]`). */
export async function getLandingCategory(
  slug: string,
  locale: Locale,
): Promise<{ slug: string; name: string } | null> {
  const category = await getDb().category.findFirst({
    where: { slug, approved: true },
    select: { slug: true, ...names },
  });
  return category
    ? { slug: category.slug, name: pickLocalizedName(category, locale) }
    : null;
}
