import type { RegionSeed } from "./cantons";

/**
 * Die fünf Städte, die das Mega-Menü der PRD (6.3) nennt, in dieser Reihenfolge.
 * Sie und ihre Kantone sind zum Start freigegeben; alle weiteren Regionen gibt
 * die Administration frei.
 */
export const featuredCities: Array<RegionSeed & { cantonSlug: string }> = [
  {
    slug: "stadt-zuerich",
    latitude: 47.3769,
    longitude: 8.5417,
    cantonSlug: "zuerich",
    nameDe: "Zürich",
    nameFr: "Zurich",
    nameIt: "Zurigo",
    nameEn: "Zurich",
  },
  {
    slug: "stadt-bern",
    latitude: 46.948,
    longitude: 7.4474,
    cantonSlug: "bern",
    nameDe: "Bern",
    nameFr: "Berne",
    nameIt: "Berna",
    nameEn: "Bern",
  },
  {
    slug: "basel",
    latitude: 47.5596,
    longitude: 7.5886,
    cantonSlug: "basel-stadt",
    nameDe: "Basel",
    nameFr: "Bâle",
    nameIt: "Basilea",
    nameEn: "Basel",
  },
  {
    slug: "stadt-genf",
    latitude: 46.2044,
    longitude: 6.1432,
    cantonSlug: "genf",
    nameDe: "Genf",
    nameFr: "Genève",
    nameIt: "Ginevra",
    nameEn: "Geneva",
  },
  {
    slug: "lausanne",
    latitude: 46.5197,
    longitude: 6.6323,
    cantonSlug: "waadt",
    nameDe: "Lausanne",
    nameFr: "Lausanne",
    nameIt: "Losanna",
    nameEn: "Lausanne",
  },
];
