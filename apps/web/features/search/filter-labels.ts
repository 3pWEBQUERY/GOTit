import {
  activeFilters,
  type FilterKey,
  type SearchQuery,
} from "@app/core/search/query";

/** Texte, aus denen Chips und der Name einer gespeicherten Suche entstehen. */
export interface FilterLabelSource {
  regionName: (slug: string) => string | null;
  categoryName: (slug: string) => string | null;
  languageName: (code: string) => string;
  list: (items: string[]) => string;
  t: {
    text: (text: string) => string;
    radius: (km: number) => string;
    priceRange: (min: number, max: number) => string;
    priceFrom: (min: number) => string;
    priceTo: (max: number) => string;
    photos: string;
    newOnly: string;
    withReviews: string;
  };
}

export interface FilterLabel {
  key: FilterKey;
  label: string;
}

/** Ein Text pro aktivem Filter, in der festen Reihenfolge von `activeFilters`. */
export function filterLabels(
  query: SearchQuery,
  source: FilterLabelSource,
): FilterLabel[] {
  return activeFilters(query).flatMap((key): FilterLabel[] => {
    const label = labelFor(key, query, source);
    return label ? [{ key, label }] : [];
  });
}

function labelFor(
  key: FilterKey,
  query: SearchQuery,
  { regionName, categoryName, languageName, list, t }: FilterLabelSource,
): string | null {
  switch (key) {
    case "q":
      return query.q ? t.text(query.q) : null;
    case "region":
      return query.region ? (regionName(query.region) ?? query.region) : null;
    case "radiusKm":
      return query.radiusKm ? t.radius(query.radiusKm) : null;
    case "languages":
      return list(query.languages.map(languageName));
    case "categories":
      return list(query.categories.map((slug) => categoryName(slug) ?? slug));
    case "price":
      if (query.priceMin !== null && query.priceMax !== null)
        return t.priceRange(query.priceMin, query.priceMax);
      if (query.priceMin !== null) return t.priceFrom(query.priceMin);
      return query.priceMax !== null ? t.priceTo(query.priceMax) : null;
    case "photos":
      return t.photos;
    case "newOnly":
      return t.newOnly;
    case "withReviews":
      return t.withReviews;
  }
}

/** Höchstlänge des Namens einer gespeicherten Suche (Kern: 60 Zeichen). */
const NAME_MAX = 60;

/** Vorgeschlagener Name einer gespeicherten Suche, zum Beispiel «Zürich · Deutsch · Fotos geprüft». */
export function savedSearchName(
  labels: readonly FilterLabel[],
  fallback: string,
): string {
  const name = labels.map((entry) => entry.label).join(" · ");
  if (!name) return fallback;
  return name.length <= NAME_MAX
    ? name
    : `${name.slice(0, NAME_MAX - 1).trimEnd()}…`;
}
