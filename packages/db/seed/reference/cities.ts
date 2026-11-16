import type { RegionSeed } from "./cantons";

/**
 * Die fünf Städte, die das Mega-Menü der PRD (6.3) nennt, in dieser Reihenfolge.
 * Sie und ihre Kantone sind zum Start freigegeben; alle weiteren Regionen gibt
 * die Administration frei.
 */
export const featuredCities: Array<RegionSeed & { cantonSlug: string }> = [
  { slug: "stadt-zuerich", cantonSlug: "zuerich", nameDe: "Zürich", nameFr: "Zurich", nameIt: "Zurigo", nameEn: "Zurich" },
  { slug: "stadt-bern", cantonSlug: "bern", nameDe: "Bern", nameFr: "Berne", nameIt: "Berna", nameEn: "Bern" },
  { slug: "basel", cantonSlug: "basel-stadt", nameDe: "Basel", nameFr: "Bâle", nameIt: "Basilea", nameEn: "Basel" },
  { slug: "stadt-genf", cantonSlug: "genf", nameDe: "Genf", nameFr: "Genève", nameIt: "Ginevra", nameEn: "Geneva" },
  { slug: "lausanne", cantonSlug: "waadt", nameDe: "Lausanne", nameFr: "Lausanne", nameIt: "Losanna", nameEn: "Lausanne" },
];
